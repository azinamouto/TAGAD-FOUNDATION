import './testEnvironment';
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  StatisticalCatalogService,
  STATISTICAL_69_TABLE_CATALOG,
} from '../server/services/StatisticalCatalogService';
import {
  StatisticalTableClassification,
  StatisticalVerificationStatus,
} from '@prisma/client';

describe('Sprint 8 — Statistical Catalog & Category UX Backend Verification Suite', () => {
  beforeEach(() => {
    StatisticalCatalogService.resetInMemoryTestState();
  });

  describe('1. 69-Table Master Register Integrity', () => {
    test('All 69 PSA CBMS statistical tables are registered', async () => {
      assert.strictEqual(STATISTICAL_69_TABLE_CATALOG.length, 69);
      const tables = await StatisticalCatalogService.getAllTableDefinitions();
      const list = Array.isArray(tables) ? tables : (tables as any).data;
      assert.strictEqual(list.length, 69);
    });

    test('Table numbers preserve the source gap at 68 and final Table 70', () => {
      const numbers = STATISTICAL_69_TABLE_CATALOG.map((t) => t.tableNumber).sort((a, b) => a - b);
      assert.strictEqual(numbers[0], 1);
      assert.strictEqual(numbers[numbers.length - 1], 70);
      const uniqueNumbers = new Set(numbers);
      assert.strictEqual(uniqueNumbers.size, 69);
      assert.equal(uniqueNumbers.has(68), false);
    });

    test('Table codes are unique normalized source tab names', () => {
      const codes = STATISTICAL_69_TABLE_CATALOG.map((t) => t.tableCode);
      const uniqueCodes = new Set(codes);
      assert.strictEqual(uniqueCodes.size, 69);
      for (const code of codes) {
        assert.match(code, /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/);
      }
    });

    test('Every table has a non-empty title, domain, expectedUnit, and description', () => {
      for (const t of STATISTICAL_69_TABLE_CATALOG) {
        assert.ok(t.title && t.title.length > 3, `Table ${t.tableCode} missing title`);
        assert.ok(t.domain && t.domain.length > 2, `Table ${t.tableCode} missing domain`);
        assert.ok(t.expectedUnit && t.expectedUnit.length > 0, `Table ${t.tableCode} missing expectedUnit`);
        assert.ok(t.description && t.description.length > 5, `Table ${t.tableCode} missing description`);
        assert.ok(
          t.verificationStatus === StatisticalVerificationStatus.UNVERIFIED ||
          t.verificationStatus === StatisticalVerificationStatus.VERIFIED ||
          t.verificationStatus === StatisticalVerificationStatus.PROVISIONAL,
          `Table ${t.tableCode} invalid verification status`
        );
      }
    });
  });

  describe('2. Search & Filter Engine', () => {
    test('Search by table code returns exact table', async () => {
      const result: any = await StatisticalCatalogService.getAllTableDefinitions({ search: 'SUMMARY_STATISTICS' });
      const items = Array.isArray(result) ? result : result.data;
      assert.ok(items.length >= 1);
      assert.strictEqual(items[0].tableCode, 'SUMMARY_STATISTICS');
    });

    test('Search by keyword matches in title or description', async () => {
      const result: any = await StatisticalCatalogService.getAllTableDefinitions({ search: 'Household' });
      const items = Array.isArray(result) ? result : result.data;
      assert.ok(items.length > 0);
      for (const item of items) {
        const matches =
          item.title.toLowerCase().includes('household') ||
          (item.description && item.description.toLowerCase().includes('household')) ||
          item.tableCode.toLowerCase().includes('household') ||
          item.domain.toLowerCase().includes('household');
        assert.ok(matches);
      }
    });

    test('Filter by domain returns only matching domain tables', async () => {
      const result: any = await StatisticalCatalogService.getAllTableDefinitions({
        domain: 'Demographics & Population',
      });
      const items = Array.isArray(result) ? result : result.data;
      assert.ok(items.length > 0);
      for (const item of items) {
        assert.ok(item.domain.toLowerCase().includes('demographics'));
      }
    });

    test('Filter by classification distinguishes indicators from aggregated statistics', async () => {
      const indicators: any = await StatisticalCatalogService.getAllTableDefinitions({
        classification: StatisticalTableClassification.INDICATOR,
      });
      const indList = Array.isArray(indicators) ? indicators : indicators.data;
      assert.ok(indList.length > 0);
      for (const item of indList) {
        assert.strictEqual(item.classification, StatisticalTableClassification.INDICATOR);
      }

      const aggregates: any = await StatisticalCatalogService.getAllTableDefinitions({
        classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
      });
      const aggList = Array.isArray(aggregates) ? aggregates : aggregates.data;
      assert.ok(aggList.length > 0);
      for (const item of aggList) {
        assert.strictEqual(item.classification, StatisticalTableClassification.AGGREGATED_STATISTICS);
      }
    });

    test('Filter by verification status', async () => {
      const result: any = await StatisticalCatalogService.getAllTableDefinitions({
        verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
      });
      const items = Array.isArray(result) ? result : result.data;
      assert.strictEqual(items.length, 69);
    });
  });

  describe('3. Pagination Handling', () => {
    test('Paginates properly when page and limit are provided', async () => {
      const result: any = await StatisticalCatalogService.getAllTableDefinitions({
        page: 1,
        limit: 10,
      });
      assert.ok(!Array.isArray(result));
      assert.strictEqual(result.data.length, 10);
      assert.strictEqual(result.total, 69);
      assert.strictEqual(result.page, 1);
      assert.strictEqual(result.limit, 10);
      assert.strictEqual(result.totalPages, 7);
    });

    test('Page 7 contains the remaining 9 items', async () => {
      const result: any = await StatisticalCatalogService.getAllTableDefinitions({
        page: 7,
        limit: 10,
      });
      assert.strictEqual(result.data.length, 9);
      assert.strictEqual(result.page, 7);
    });
  });

  describe('4. Single Table Detail Resolution', () => {
    test('Retrieves table by integer number', async () => {
      const table = await StatisticalCatalogService.getTableDefinitionByNumber(1);
      assert.ok(table);
      assert.strictEqual(table.tableCode, 'SUMMARY_STATISTICS');
      assert.strictEqual(table.tableNumber, 1);
    });

    test('Retrieves table by string table code (case-insensitive)', async () => {
      const table = await StatisticalCatalogService.getTableDefinitionByCode('population_by_sex');
      assert.ok(table);
      assert.strictEqual(table.tableNumber, 24);
      assert.strictEqual(table.tableCode, 'POPULATION_BY_SEX');
    });

    test('Retrieves table by polymorphic identifier', async () => {
      const byNum = await StatisticalCatalogService.getTableDefinitionByCodeOrNumber('62');
      assert.ok(byNum);
      assert.strictEqual(byNum.tableNumber, 62);

      const byCode = await StatisticalCatalogService.getTableDefinitionByCodeOrNumber('SDG_5_5_2');
      assert.ok(byCode);
      assert.strictEqual(byCode.tableNumber, 62);
    });

    test('Returns null for non-existent table', async () => {
      const notFound = await StatisticalCatalogService.getTableDefinitionByCodeOrNumber('STAT-TAB-999');
      assert.strictEqual(notFound, null);
    });
  });

  describe('5. Domain Breakdown and Standard Dimensions', () => {
    test('getDomainsSummary aggregates all registered tables and metrics', async () => {
      const domains = await StatisticalCatalogService.getDomainsSummary();
      assert.ok(Array.isArray(domains));
      assert.ok(domains.length > 0);
      const totalTablesInDomains = domains.reduce((acc, d) => acc + d.tableCount, 0);
      assert.strictEqual(totalTablesInDomains, 69);
    });

    test('getDimensions returns analytical dimensions register', async () => {
      const dimensions = await StatisticalCatalogService.getDimensions();
      assert.ok(Array.isArray(dimensions));
      assert.ok(dimensions.length >= 5);
      const sexDim = dimensions.find((d) => d.dimensionCode === 'DIM_SEX');
      assert.ok(sexDim);
      assert.strictEqual(sexDim.name, 'Sex');
    });
  });
});
