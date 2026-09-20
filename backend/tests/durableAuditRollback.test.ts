import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { AuditService } from '../server/services/AuditService';
import { OfficeService } from '../server/services/OfficeService';
import { UserService } from '../server/services/UserService';
import { ProgramService } from '../server/services/ProgramService';
import { AccomplishmentService } from '../server/services/AccomplishmentService';
import { BeneficiaryService } from '../server/services/BeneficiaryService';
import { Role } from '@prisma/client';

describe('BE Phase 1 — Priority 1: Durable Auditing & Transactional Rollbacks (F-1)', () => {
  const originalTransaction = prisma.$transaction;

  before(() => {
    setDatabaseConnected(true);
  });

  after(() => {
    setDatabaseConnected(false);
    prisma.$transaction = originalTransaction;
  });

  describe('1. AuditService Error Propagation', () => {
    it('rejects a missing transaction in connected mode', async () => {
      await assert.rejects(AuditService.logActionTx(null, {
        action: 'OFFICE_CREATED', entityType: 'Office',
      }), /requires the business mutation transaction/);
    });

    it('never substitutes memory audit records in production when storage is unavailable', async () => {
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      setDatabaseConnected(false);
      try {
        await assert.rejects(AuditService.logActionTx(null, {
          action: 'OFFICE_CREATED', entityType: 'Office',
        }), /Audit storage unavailable/);
      } finally {
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
        setDatabaseConnected(true);
      }
    });

    it('logActionTx throws immediately when tx.auditLog.create fails, propagating to abort transaction', async () => {
      const injectedError = new Error('INJECTED_AUDIT_DISK_FULL_ERROR');
      const mockTx = {
        auditLog: {
          create: mock.fn(async () => {
            throw injectedError;
          }),
        },
      };

      await assert.rejects(
        async () => {
          await AuditService.logActionTx(mockTx, {
            userId: 'usr-test-1',
            action: 'OFFICE_CREATED',
            entityType: 'Office',
            entityId: 'off-test-1',
          });
        },
        (err: any) => {
          assert.strictEqual(err.message, 'INJECTED_AUDIT_DISK_FULL_ERROR');
          return true;
        }
      );

      assert.strictEqual(mockTx.auditLog.create.mock.calls.length, 1);
    });

    it('logAction throws immediately when prisma.auditLog.create fails in connected mode', async () => {
      const injectedError = new Error('INJECTED_AUDIT_DB_CONNECTION_LOST');
      const originalCreate = prisma.auditLog.create;
      prisma.auditLog.create = mock.fn(async () => {
        throw injectedError;
      }) as any;

      try {
        await assert.rejects(
          async () => {
            await AuditService.logAction({
              userId: 'usr-test-1',
              action: 'TEST_ACTION',
              entityType: 'TestEntity',
            });
          },
          (err: any) => {
            assert.strictEqual(err.message, 'INJECTED_AUDIT_DB_CONNECTION_LOST');
            return true;
          }
        );
      } finally {
        prisma.auditLog.create = originalCreate;
      }
    });
  });

  describe('2. OfficeService Mutation Rollbacks on Injected Audit Failure', () => {
    it('createOffice rolls back and leaves no persisted office when audit creation fails', async () => {
      let officeCreatedInTx = false;
      let transactionRolledBack = false;

      // Mock transaction harness simulating PostgreSQL transaction abort on error
      prisma.$transaction = (async (callback: any) => {
        const tx = {
          office: {
            create: mock.fn(async (args: any) => {
              officeCreatedInTx = true;
              return { id: 'off-rollback-1', ...args.data };
            }),
          },
          auditLog: {
            create: mock.fn(async () => {
              throw new Error('AUDIT_LOG_STORAGE_FAILURE');
            }),
          },
        };

        try {
          return await callback(tx);
        } catch (error) {
          transactionRolledBack = true;
          officeCreatedInTx = false; // Transaction rollback discards uncommitted office
          throw error;
        }
      }) as any;

      const originalFindUnique = prisma.office.findUnique;
      prisma.office.findUnique = mock.fn(async () => null) as any;

      try {
        await assert.rejects(
          async () => {
            await OfficeService.createOffice({
              code: 'ROLLBACK_OFF',
              name: 'Rollback Test Office',
            });
          },
          (err: any) => {
            assert.strictEqual(err.message, 'AUDIT_LOG_STORAGE_FAILURE');
            return true;
          }
        );

        assert.strictEqual(transactionRolledBack, true, 'Transaction must be rolled back on audit failure');
        assert.strictEqual(officeCreatedInTx, false, 'Office must not remain created after rollback');
      } finally {
        prisma.office.findUnique = originalFindUnique;
      }
    });

    it('updateOffice rolls back and retains before-state when audit creation fails', async () => {
      const originalOffice = {
        id: 'off-update-test',
        code: 'ORIG_OFF',
        name: 'Original Office Name',
        headName: 'Original Head',
        isActive: true,
      };

      let currentOfficeState = { ...originalOffice };
      let transactionRolledBack = false;

      prisma.$transaction = (async (callback: any) => {
        let provisionalState = { ...currentOfficeState };
        const tx = {
          office: {
            update: mock.fn(async (args: any) => {
              provisionalState = { ...provisionalState, ...args.data };
              return provisionalState;
            }),
          },
          auditLog: {
            create: mock.fn(async () => {
              throw new Error('AUDIT_LOG_WRITE_ABORT');
            }),
          },
        };

        try {
          const result = await callback(tx);
          currentOfficeState = provisionalState; // Commit
          return result;
        } catch (error) {
          transactionRolledBack = true; // Rollback
          throw error;
        }
      }) as any;

      const originalFindUnique = prisma.office.findUnique;
      prisma.office.findUnique = mock.fn(async () => originalOffice) as any;

      try {
        await assert.rejects(
          async () => {
            await OfficeService.updateOffice('off-update-test', {
              name: 'Mutated Name That Should Rollback',
            });
          },
          (err: any) => {
            assert.strictEqual(err.message, 'AUDIT_LOG_WRITE_ABORT');
            return true;
          }
        );

        assert.strictEqual(transactionRolledBack, true, 'Transaction must rollback on audit failure');
        assert.deepStrictEqual(
          currentOfficeState,
          originalOffice,
          'Database state must retain exact before-state'
        );
      } finally {
        prisma.office.findUnique = originalFindUnique;
      }
    });
  });

  describe('3. UserService Mutation Rollbacks on Injected Audit Failure', () => {
    it('createUser rolls back and does not commit user record when audit fails', async () => {
      let userCommitted = false;
      let transactionAborted = false;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          user: {
            create: mock.fn(async (args: any) => {
              return { id: 'usr-new-1', ...args.data, office: null, barangay: null };
            }),
          },
          auditLog: {
            create: mock.fn(async () => {
              throw new Error('AUDIT_INDEX_COLLISION');
            }),
          },
        };

        try {
          const res = await callback(tx);
          userCommitted = true;
          return res;
        } catch (error) {
          transactionAborted = true;
          throw error;
        }
      }) as any;

      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = mock.fn(async () => null) as any;

      try {
        await assert.rejects(
          async () => {
            await UserService.createUser({
              email: 'rollback_user@talibon.gov.ph',
              password: 'Password123!',
              fullName: 'Rollback User',
              role: Role.ENCODER,
            });
          },
          (err: any) => {
            assert.strictEqual(err.message, 'AUDIT_INDEX_COLLISION');
            return true;
          }
        );

        assert.strictEqual(transactionAborted, true);
        assert.strictEqual(userCommitted, false);
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });
  });

  describe('4. ProgramService Mutation Rollbacks on Injected Audit Failure', () => {
    it('createProgram rolls back and leaves no budget allocation when audit fails', async () => {
      let programCommitted = false;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          program: {
            create: mock.fn(async (args: any) => ({
              id: 'prog-roll-1',
              ...args.data,
              office: { id: 'off-1', name: 'MSWDO', code: 'MSWDO' },
            })),
          },
          auditLog: {
            create: mock.fn(async () => {
              throw new Error('AUDIT_IMMUTABILITY_ENFORCEMENT_ERROR');
            }),
          },
        };

        try {
          const res = await callback(tx);
          programCommitted = true;
          return res;
        } catch (error) {
          throw error;
        }
      }) as any;

      await assert.rejects(
        async () => {
          await ProgramService.createProgram(
            {
              title: 'Gender Equality Seminar',
              budget: 150000,
              officeId: 'off-1',
              year: 2026,
            },
            { id: 'usr-admin-1', role: Role.ADMIN, officeId: 'off-1' }
          );
        },
        (err: any) => {
          assert.strictEqual(err.message, 'AUDIT_IMMUTABILITY_ENFORCEMENT_ERROR');
          return true;
        }
      );

      assert.strictEqual(programCommitted, false);
    });
  });

  describe('5. Accomplishment & Beneficiary Mutation Rollbacks', () => {
    it('createAccomplishment rolls back entirely when audit logging rejects', async () => {
      let accomplishmentCommitted = false;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          gADAccomplishment: {
            create: mock.fn(async (args: any) => ({
              id: 'acc-roll-1',
              ...args.data,
              program: { id: 'p1', office: { id: 'off-1', code: 'MSWDO' } },
              gadPlanItem: null,
              attachments: [],
            })),
          },
          auditLog: {
            create: mock.fn(async () => {
              throw new Error('AUDIT_REJECTED');
            }),
          },
        };

        try {
          const res = await callback(tx);
          accomplishmentCommitted = true;
          return res;
        } catch (error) {
          throw error;
        }
      }) as any;

      const originalFindUniqueProg = prisma.program.findUnique;
      prisma.program.findUnique = mock.fn(async () => ({ id: 'prog-1', officeId: 'off-1' })) as any;

      try {
        await assert.rejects(
          async () => {
            await AccomplishmentService.createAccomplishment(
              {
                programId: 'prog-1',
                actualOutput: 'Conducted 5 workshops',
                actualBudgetUsed: 50000,
              },
              { id: 'usr-1', role: Role.ADMIN, officeId: 'off-1' }
            );
          },
          (err: any) => {
            assert.strictEqual(err.message, 'AUDIT_REJECTED');
            return true;
          }
        );

        assert.strictEqual(accomplishmentCommitted, false);
      } finally {
        prisma.program.findUnique = originalFindUniqueProg;
      }
    });

    it('createBeneficiary rolls back completely when audit logging fails', async () => {
      let beneficiaryCommitted = false;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          beneficiary: {
            create: mock.fn(async (args: any) => ({
              id: 'ben-roll-1',
              ...args.data,
              barangay: { id: 'bg-1', name: 'Poblacion' },
            })),
          },
          auditLog: {
            create: mock.fn(async () => {
              throw new Error('AUDIT_TABLE_UNAVAILABLE');
            }),
          },
        };

        try {
          const res = await callback(tx);
          beneficiaryCommitted = true;
          return res;
        } catch (error) {
          throw error;
        }
      }) as any;

      const originalFindUniqueBen = prisma.beneficiary.findUnique;
      prisma.beneficiary.findUnique = mock.fn(async () => null) as any;

      try {
        await assert.rejects(
          async () => {
            await BeneficiaryService.createBeneficiary(
              {
                firstName: 'Maria',
                lastName: 'Santos',
                sex: 'FEMALE',
                barangayId: 'bg-1',
              },
              { id: 'usr-1', role: Role.ADMIN, officeId: 'off-1' }
            );
          },
          (err: any) => {
            assert.strictEqual(err.message, 'AUDIT_TABLE_UNAVAILABLE');
            return true;
          }
        );

        assert.strictEqual(beneficiaryCommitted, false);
      } finally {
        prisma.beneficiary.findUnique = originalFindUniqueBen;
      }
    });
  });
});
