const PDFDocument = require('pdfkit');

/**
 * PDF Service - World-Class ATS Resume & Asset Generator
 * Supports 3 ATS-compliant templates (Modern Clean, Classic Executive, Tech Minimal)
 * plus formal Cover Letter generation.
 */
class PDFService {
  /**
   * Generate an ATS-compliant resume PDF with user-chosen template styling.
   * @param {Object} draftContent - Tailored resume draft
   * @param {Object} record - Candidate career record
   * @param {Object} options - Options including { template: 'modern' | 'executive' | 'tech' }
   * @returns {Promise<Buffer>}
   */
  async generateResume(draftContent, record, options = {}) {
    const template = options.template || 'modern';

    if (template === 'executive') {
      return this._generateExecutive(draftContent, record);
    }
    if (template === 'tech') {
      return this._generateTech(draftContent, record);
    }
    return this._generateModern(draftContent, record);
  }

  /**
   * TEMPLATE 1: MODERN CLEAN (Default ATS Standard)
   * High readability, slate & deep charcoal palette, clear hierarchical dividers.
   */
  _generateModern(draftContent, record) {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: { top: 45, bottom: 45, left: 54, right: 54 },
      font: 'Helvetica',
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    const done = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });

    const pi = record.personalInfo || {};

    // Header
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text(pi.name || 'Candidate Name');

    doc.fontSize(11).font('Helvetica').fillColor('#0284c7');
    doc.text(pi.headline || 'Professional');

    const contactParts = [
      pi.email,
      pi.phone,
      pi.location,
      pi.linkedin ? pi.linkedin.replace(/^https?:\/\//, '') : '',
      pi.portfolio ? pi.portfolio.replace(/^https?:\/\//, '') : '',
    ].filter(Boolean);

    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    doc.text(contactParts.join('  •  '));
    doc.moveDown(0.6);

    const drawSectionDivider = (title) => {
      doc.moveDown(0.4);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text(title.toUpperCase());
      const currentY = doc.y;
      doc.strokeColor('#cbd5e1').lineWidth(0.75)
        .moveTo(54, currentY + 2)
        .lineTo(612 - 54, currentY + 2)
        .stroke();
      doc.y = currentY + 6;
    };

    // Summary
    if (draftContent.summary) {
      drawSectionDivider('Professional Summary');
      doc.fontSize(9.5).font('Helvetica').fillColor('#334155');
      doc.text(draftContent.summary, { lineGap: 2.5, align: 'justify' });
    }

    // Experience
    const experiences = draftContent.experience || record.experience || [];
    if (experiences.length > 0) {
      drawSectionDivider('Work Experience');
      experiences.forEach((exp, index) => {
        if (index > 0) doc.moveDown(0.4);
        doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a');
        const role = exp.role || 'Role';
        const company = exp.company || 'Company';
        doc.text(`${role}  |  ${company}`);

        doc.fontSize(9).font('Helvetica').fillColor('#64748b');
        const dates = `${exp.startDate || ''} – ${exp.endDate ? exp.endDate : 'Present'}`;
        doc.text(dates);
        doc.moveDown(0.2);

        (exp.achievements || []).forEach((ach) => {
          const text = typeof ach === 'string' ? ach : ach.text;
          if (text) {
            doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
            doc.text(`•  ${text}`, { indent: 8, lineGap: 2 });
          }
        });
      });
    }

    // Projects
    if (record.projects && record.projects.length) {
      drawSectionDivider('Key Projects');
      record.projects.forEach((proj, index) => {
        if (index > 0) doc.moveDown(0.35);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text(`${proj.name || 'Project'}${proj.role ? ' — ' + proj.role : ''}`);
        if (proj.description) {
          doc.fontSize(9).font('Helvetica').fillColor('#334155');
          doc.text(proj.description, { indent: 8, lineGap: 1.5 });
        }
        if (proj.techStack && proj.techStack.length) {
          doc.fontSize(8.5).font('Helvetica').fillColor('#64748b');
          doc.text(`Tech Stack: ${proj.techStack.join(', ')}`, { indent: 8 });
        }
      });
    }

    // Education
    if (record.education && record.education.length) {
      drawSectionDivider('Education');
      record.education.forEach((edu, index) => {
        if (index > 0) doc.moveDown(0.3);
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text(`${edu.degree || 'Degree'}  |  ${edu.institution || 'Institution'}`);
        doc.fontSize(8.5).font('Helvetica').fillColor('#64748b');
        const eduDetails = [
          edu.startDate ? `${edu.startDate} – ${edu.endDate || ''}` : '',
          edu.honors || '',
        ].filter(Boolean).join('  •  ');
        if (eduDetails) doc.text(eduDetails);
      });
    }

    // Skills
    const skills = draftContent.skills || record.skills || [];
    if (skills && skills.length) {
      drawSectionDivider('Core Competencies & Skills');
      const names = skills.map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
      doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
      doc.text(names.join('  •  '), { lineGap: 2 });
    }

    // Footer
    doc.moveDown(1);
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8');
    doc.text('Credensa AI — Verified Career Intelligence Output', { align: 'center' });

    doc.end();
    return done;
  }

  /**
   * TEMPLATE 2: CLASSIC EXECUTIVE
   * Traditional serif elegance (Times-Roman), centered executive identity, formal line work.
   */
  _generateExecutive(draftContent, record) {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: { top: 50, bottom: 50, left: 60, right: 60 },
      font: 'Times-Roman',
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    const done = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });

    const pi = record.personalInfo || {};

    // Centered Executive Header
    doc.fontSize(24).font('Times-Bold').fillColor('#111827');
    doc.text(pi.name || 'Candidate Name', { align: 'center' });
    doc.fontSize(12).font('Times-Italic').fillColor('#374151');
    doc.text(pi.headline || 'Executive Leader', { align: 'center' });

    const contactParts = [
      pi.email,
      pi.phone,
      pi.location,
      pi.linkedin ? pi.linkedin.replace(/^https?:\/\//, '') : '',
    ].filter(Boolean);

    doc.fontSize(9.5).font('Times-Roman').fillColor('#4b5563');
    doc.text(contactParts.join('  |  '), { align: 'center' });
    doc.moveDown(0.5);

    const drawSectionDivider = (title) => {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Times-Bold').fillColor('#111827');
      doc.text(title.toUpperCase(), { align: 'center' });
      const currentY = doc.y;
      doc.strokeColor('#9ca3af').lineWidth(0.5)
        .moveTo(120, currentY + 2)
        .lineTo(612 - 120, currentY + 2)
        .stroke();
      doc.y = currentY + 6;
    };

    if (draftContent.summary) {
      drawSectionDivider('Executive Profile');
      doc.fontSize(10).font('Times-Roman').fillColor('#1f2937');
      doc.text(draftContent.summary, { lineGap: 2.5, align: 'justify' });
    }

    const experiences = draftContent.experience || record.experience || [];
    if (experiences.length > 0) {
      drawSectionDivider('Executive Experience');
      experiences.forEach((exp, index) => {
        if (index > 0) doc.moveDown(0.4);
        doc.fontSize(11).font('Times-Bold').fillColor('#111827');
        doc.text(`${exp.company || 'Company'} — ${exp.role || 'Role'}`);
        doc.fontSize(9.5).font('Times-Italic').fillColor('#4b5563');
        doc.text(`${exp.startDate || ''} to ${exp.endDate || 'Present'}`);
        doc.moveDown(0.2);

        (exp.achievements || []).forEach((ach) => {
          const text = typeof ach === 'string' ? ach : ach.text;
          if (text) {
            doc.fontSize(9.5).font('Times-Roman').fillColor('#1f2937');
            doc.text(`—  ${text}`, { indent: 12, lineGap: 2 });
          }
        });
      });
    }

    if (record.education && record.education.length) {
      drawSectionDivider('Education & Honors');
      record.education.forEach((edu) => {
        doc.fontSize(10).font('Times-Bold').fillColor('#111827');
        doc.text(`${edu.degree || 'Degree'}, ${edu.institution || 'Institution'}`);
        if (edu.honors) {
          doc.fontSize(9).font('Times-Italic').fillColor('#4b5563');
          doc.text(edu.honors);
        }
      });
    }

    const skills = draftContent.skills || record.skills || [];
    if (skills && skills.length) {
      drawSectionDivider('Areas of Expertise');
      const names = skills.map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
      doc.fontSize(9.5).font('Times-Roman').fillColor('#1f2937');
      doc.text(names.join('  •  '), { align: 'center', lineGap: 2 });
    }

    doc.end();
    return done;
  }

  /**
   * TEMPLATE 3: TECH MINIMAL (Developer & Engineering Focus)
   * Compact, high information density, clear skill tags, courier accents.
   */
  _generateTech(draftContent, record) {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: { top: 40, bottom: 40, left: 45, right: 45 },
      font: 'Helvetica',
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    const done = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });

    const pi = record.personalInfo || {};

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#09090b');
    doc.text(pi.name || 'Candidate Name');
    doc.fontSize(10).font('Courier').fillColor('#2563eb');
    doc.text(`> ${pi.headline || 'Software Engineer'}`);

    const contactParts = [
      pi.email,
      pi.phone,
      pi.linkedin ? pi.linkedin.replace(/^https?:\/\//, '') : '',
      pi.portfolio ? pi.portfolio.replace(/^https?:\/\//, '') : '',
    ].filter(Boolean);

    doc.fontSize(8.5).font('Courier').fillColor('#52525b');
    doc.text(contactParts.join(' | '));
    doc.moveDown(0.4);

    const drawSectionDivider = (title) => {
      doc.moveDown(0.3);
      doc.fontSize(10).font('Courier-Bold').fillColor('#09090b');
      doc.text(`// ${title.toUpperCase()}`);
      const currentY = doc.y;
      doc.strokeColor('#e4e4e7').lineWidth(0.5)
        .moveTo(45, currentY + 1)
        .lineTo(612 - 45, currentY + 1)
        .stroke();
      doc.y = currentY + 4;
    };

    if (draftContent.summary) {
      drawSectionDivider('Summary');
      doc.fontSize(9).font('Helvetica').fillColor('#27272a');
      doc.text(draftContent.summary, { lineGap: 2 });
    }

    const skills = draftContent.skills || record.skills || [];
    if (skills && skills.length) {
      drawSectionDivider('Technical Stack & Tools');
      const names = skills.map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
      doc.fontSize(8.5).font('Courier').fillColor('#18181b');
      doc.text(names.join(', '), { lineGap: 1.5 });
    }

    const experiences = draftContent.experience || record.experience || [];
    if (experiences.length > 0) {
      drawSectionDivider('Engineering Experience');
      experiences.forEach((exp, index) => {
        if (index > 0) doc.moveDown(0.3);
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#09090b');
        doc.text(`${exp.role || 'Engineer'} @ ${exp.company || 'Company'}`);
        doc.fontSize(8).font('Courier').fillColor('#71717a');
        doc.text(`[${exp.startDate || ''} -> ${exp.endDate || 'Present'}]`);
        doc.moveDown(0.15);

        (exp.achievements || []).forEach((ach) => {
          const text = typeof ach === 'string' ? ach : ach.text;
          if (text) {
            doc.fontSize(8.5).font('Helvetica').fillColor('#27272a');
            doc.text(`* ${text}`, { indent: 10, lineGap: 1.5 });
          }
        });
      });
    }

    if (record.projects && record.projects.length) {
      drawSectionDivider('Systems & Open Source Projects');
      record.projects.forEach((proj) => {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#09090b');
        doc.text(`${proj.name || 'Project'}`);
        if (proj.description) {
          doc.fontSize(8.5).font('Helvetica').fillColor('#27272a');
          doc.text(proj.description, { indent: 8 });
        }
        if (proj.techStack && proj.techStack.length) {
          doc.fontSize(8).font('Courier').fillColor('#2563eb');
          doc.text(`stack: [${proj.techStack.join(', ')}]`, { indent: 8 });
        }
      });
    }

    doc.end();
    return done;
  }

  /**
   * Generate formal Cover Letter PDF.
   */
  async generateCoverLetter(draftContent, record) {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: { top: 60, bottom: 60, left: 60, right: 60 },
      font: 'Helvetica',
    });

    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    const done = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });

    const pi = record.personalInfo || {};

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text(pi.name || 'Candidate Name');
    doc.fontSize(10).font('Helvetica').fillColor('#64748b');
    const contact = [pi.email, pi.phone, pi.location].filter(Boolean).join('  |  ');
    doc.text(contact);
    doc.moveDown(0.5);

    const currentY = doc.y;
    doc.strokeColor('#e2e8f0').lineWidth(1)
      .moveTo(60, currentY)
      .lineTo(612 - 60, currentY)
      .stroke();
    doc.y = currentY + 15;

    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    doc.moveDown(0.8);

    doc.text('Hiring Committee / Search Team');
    doc.moveDown(0.8);

    doc.fontSize(10.5).font('Helvetica').fillColor('#0f172a');
    doc.text('Dear Hiring Manager,');
    doc.moveDown(0.5);

    const letterBody = draftContent.coverLetter || 'Thank you for considering my application...';
    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(letterBody, { lineGap: 3.5, align: 'justify' });
    doc.moveDown(1);

    doc.text('Sincerely,');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text(pi.name || 'Candidate Name');

    doc.end();
    return done;
  }
}

module.exports = { PDFService };
