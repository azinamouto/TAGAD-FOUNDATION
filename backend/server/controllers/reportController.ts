import { requireReadScope } from '../lib/readScope';
import { sendError } from '../lib/response';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { GADPlanService } from '../services/GADPlanService';
import { AccomplishmentService } from '../services/AccomplishmentService';
import { BeneficiaryService } from '../services/BeneficiaryService';

export const getGPBExcel = async (req: AuthenticatedRequest, res: Response) => {
  const { year, office } = req.query;

  try {
    requireReadScope(req.user);
    const planResult = await GADPlanService.getGADPlans({
      year: year ? parseInt(year as string, 10) : undefined,
      office: office as string,
    }, req.user, { strict: true });
    const plans = planResult.plans || [];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GPB');

    worksheet.columns = [
      { header: 'No.', key: 'no', width: 5 },
      { header: 'Gender Issue', key: 'issue', width: 30 },
      { header: 'GAD Result', key: 'result', width: 30 },
      { header: 'Activity', key: 'activity', width: 30 },
      { header: 'Performance Indicator', key: 'indicator', width: 25 },
      { header: 'Target Group', key: 'target', width: 20 },
      { header: 'Timeline', key: 'timeline', width: 15 },
      { header: 'Responsible Office', key: 'office', width: 20 },
      { header: 'Budget', key: 'budget', width: 15 },
      { header: 'Fund Source', key: 'source', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    worksheet.insertRow(1, [`GENDER AND DEVELOPMENT PLAN AND BUDGET - Municipality of Talibon - ${year || 'All Years'}`]);
    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    let rowIdx = 1;
    plans.forEach((plan: any) => {
      const items = plan.items || [];
      if (items.length === 0) {
        worksheet.addRow({
          no: rowIdx++,
          issue: null,
          result: null,
          activity: 'No activity items recorded',
          indicator: null,
          target: null,
          timeline: null,
          office: plan.office?.name || plan.officeName || (typeof plan.office === 'string' ? plan.office : null),
          budget: plan.totalBudget == null ? null : Number(plan.totalBudget),
          source: null,
          status: plan.status || null,
        });
      } else {
        items.forEach((item: any) => {
          worksheet.addRow({
            no: rowIdx++,
            issue: item.genderIssue,
            result: item.gadResult,
            activity: item.activity,
            indicator: item.performanceIndicator,
            target: item.targetGroup,
            timeline: item.timeline,
            office: item.responsibleOffice || plan.office?.name || plan.officeName || (typeof plan.office === 'string' ? plan.office : null),
            budget: Number(item.budget),
            source: item.fundSource,
            status: plan.status,
          });
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=GPB_${year || 'ALL'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return sendError(res, error as Error);
  }
};

export const getGARExcel = async (req: AuthenticatedRequest, res: Response) => {
  const { year, office } = req.query;

  try {
    requireReadScope(req.user);
    const accomplishments = await AccomplishmentService.getAccomplishments({
      year: year ? parseInt(year as string, 10) : undefined,
      officeId: office as string,
    }, req.user, { strict: true });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GAR');

    worksheet.columns = [
      { header: 'No.', key: 'no', width: 5 },
      { header: 'Activity / Program', key: 'activity', width: 30 },
      { header: 'Responsible Office', key: 'office', width: 20 },
      { header: 'Actual Output', key: 'actualOutput', width: 30 },
      { header: 'Approved Budget', key: 'approvedBudget', width: 15 },
      { header: 'Actual Budget Used', key: 'actualBudget', width: 15 },
      { header: 'Male Beneficiaries', key: 'male', width: 15 },
      { header: 'Female Beneficiaries', key: 'female', width: 15 },
      { header: 'Total Beneficiaries', key: 'total', width: 15 },
      { header: 'Variance / Remarks', key: 'remarks', width: 25 },
    ];

    worksheet.insertRow(1, [`GAD ACCOMPLISHMENT REPORT - Municipality of Talibon - ${year || 'All Years'}`]);
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    accomplishments.forEach((acc: any, index: number) => {
      const activityTitle = acc.gadPlanItem?.activity || acc.program?.title || acc.gadPlan?.activity || null;
      const officeName = acc.gadPlanItem?.gadPlan?.office?.name || acc.program?.office?.name || acc.gadPlan?.office || null;
      const sourceBudget = acc.gadPlanItem?.budget ?? acc.program?.budgetTarget ?? acc.gadPlan?.budget;
      const approvedBudget = sourceBudget == null ? null : Number(sourceBudget);
      const male = acc.actualMale ?? acc.actualBeneficiaryMale ?? null;
      const female = acc.actualFemale ?? acc.actualBeneficiaryFemale ?? null;

      worksheet.addRow({
        no: index + 1,
        activity: activityTitle,
        office: officeName,
        actualOutput: acc.actualOutput,
        approvedBudget,
        actualBudget: acc.actualBudgetUsed == null ? null : Number(acc.actualBudgetUsed),
        male,
        female,
        total: male == null || female == null ? null : male + female,
        remarks: acc.remarks || acc.varianceExplanation || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=GAR_${year || 'ALL'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return sendError(res, error as Error);
  }
};

export const getBeneficiariesExcel = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await BeneficiaryService.getBeneficiaries({ limit: 1000 }, req.user, { strict: true });
    const beneficiaries = result.data || [];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Beneficiaries');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Sex', key: 'sex', width: 10 },
      { header: 'Age', key: 'age', width: 8 },
      { header: 'Barangay', key: 'barangay', width: 20 },
      { header: 'Sector', key: 'sector', width: 20 },
      { header: 'Office', key: 'office', width: 20 },
      { header: 'Date Encoded', key: 'dateEncoded', width: 15 },
    ];

    beneficiaries.forEach((b: any) => {
      worksheet.addRow({
        id: String(b.id || '').slice(0, 8),
        firstName: b.firstName,
        lastName: b.lastName,
        sex: b.sex,
        age: b.age,
        barangay: typeof b.barangay === 'object' ? b.barangay.name : b.barangay || '',
        sector: b.sector,
        office: typeof b.office === 'object' ? b.office.code || b.office.name : b.office || '',
        dateEncoded: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Beneficiaries_${new Date().getFullYear()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return sendError(res, error as Error);
  }
};

export const getBeneficiariesPDF = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await BeneficiaryService.getBeneficiaries({ limit: 100 }, req.user, { strict: true });
    const beneficiaries = result.data || [];

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Beneficiaries_Report.pdf`);

    doc.pipe(res);

    doc.fontSize(16).text('MUNICIPALITY OF TALIBON', { align: 'center' });
    doc.fontSize(12).text('Gender and Development (GAD) Beneficiary Registry', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).text(`Generated Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Total Records Displayed: ${beneficiaries.length}`);
    doc.moveDown();

    beneficiaries.forEach((b: any, i: number) => {
      const brgy = typeof b.barangay === 'object' ? b.barangay.name : b.barangay || 'Not recorded';
      doc.fontSize(9).text(
        `${i + 1}. ${b.lastName}, ${b.firstName} | Sex: ${b.sex} | Age: ${b.age} | Brgy: ${brgy} | Sector: ${b.sector}`
      );
    });

    doc.end();
  } catch (error) {
    return sendError(res, error as Error);
  }
};

