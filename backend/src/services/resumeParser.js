const pdfModule = require('pdf-parse');
const mammoth = require('mammoth');
const { GeminiService } = require('./geminiService');

let geminiServiceInstance = null;
function getGeminiService() {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService();
  }
  return geminiServiceInstance;
}

/**
 * Extract text from a PDF file buffer.
 * Supports both pdf-parse v1 (function) and v2 (PDFParse class).
 * @param {Buffer} buffer - Raw file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractFromPdf(buffer) {
  if (typeof pdfModule === 'function') {
    const data = await pdfModule(buffer);
    return data.text || '';
  }
  if (pdfModule && pdfModule.PDFParse) {
    const parser = new pdfModule.PDFParse({ data: buffer });
    const res = await parser.getText();
    return (res && res.text) || '';
  }
  throw new Error('PDF parsing engine unavailable');
}

/**
 * Extract text from a DOCX file buffer.
 * @param {Buffer} buffer - Raw file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

/**
 * Auto-detect file type from MIME type or extension and extract text.
 * Supports PDF (.pdf) and Word (.docx) files.
 * @param {Buffer} buffer - Raw file buffer
 * @param {string} mimeType - MIME type from upload (e.g. 'application/pdf')
 * @param {string} originalName - Original filename for extension fallback
 * @returns {Promise<string>} Extracted text
 */
async function parseResume(buffer, mimeType, originalName) {
  const mime = (mimeType || '').toLowerCase();
  const name = (originalName || '').toLowerCase();

  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return extractFromPdf(buffer);
  }

  if (
    mime.includes('wordprocessingml') ||
    mime.includes('officedocument.wordprocessingml') ||
    name.endsWith('.docx')
  ) {
    return extractFromDocx(buffer);
  }

  // Fallback: try PDF first, then DOCX
  try {
    return await extractFromPdf(buffer);
  } catch (_pdfErr) {
    try {
      return await extractFromDocx(buffer);
    } catch (_docxErr) {
      throw new Error(
        'Unable to parse file. Please upload a PDF or DOCX file.'
      );
    }
  }
}

/**
 * Extract career fields using Google Gemini AI, with regex fallback.
 * @param {string} text - Raw resume text
 * @returns {Promise<Object>} Extracted fields
 */
async function extractCareerFieldsWithAI(text) {
  if (!text || typeof text !== 'string') {
    return extractCareerFields('');
  }

  try {
    const aiService = getGeminiService();
    const parsed = await aiService.parseResume(text.slice(0, 8000));
    if (parsed && (parsed.name || parsed.email || (parsed.skills && parsed.skills.length > 0))) {
      return {
        ...parsed,
        source: 'gemini-ai',
      };
    }
  } catch (err) {
    console.warn('AI resume parsing fallback triggered:', err.message);
  }

  // Fallback to heuristic parser
  return {
    ...extractCareerFields(text),
    source: 'heuristic-regex',
  };
}

/**
 * Extract key fields from resume text using heuristics.
 * @param {string} text - Raw resume text
 * @returns {Object} Parsed fields
 */
function extractCareerFields(text) {
  if (!text || typeof text !== 'string') {
    return {
      name: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      summary: '',
      experience: [],
      education: [],
      skills: [],
    };
  }

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Extract phone
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/i);
  const linkedin = linkedinMatch ? `https://${linkedinMatch[0]}` : '';

  // Extract name - look at first non-empty line that isn't an email/phone
  const lines = normalized.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  let name = '';
  for (const line of lines) {
    if (
      line.includes('@') ||
      line.match(/^\+?\d/) ||
      line.toLowerCase().includes('resume') ||
      line.toLowerCase().includes('curriculum vitae') ||
      line.includes('linkedin.com') ||
      line.includes('http')
    ) {
      continue;
    }
    if (line.length > 50) continue;
    name = line;
    break;
  }

  // Extract headline - first line after name that looks like a title
  let headline = '';
  const nameIndex = lines.findIndex((l) => l === name);
  if (nameIndex >= 0 && nameIndex + 1 < lines.length) {
    headline = lines[nameIndex + 1];
    if (headline.length > 120) headline = headline.slice(0, 120) + '...';
  }

  const skills = extractSkills(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);

  return {
    name: name.trim(),
    headline: headline.trim(),
    email: email.trim(),
    phone: phone.trim(),
    location: '',
    linkedin: linkedin.trim(),
    summary: '',
    experience,
    education,
    skills,
  };
}

/**
 * Extract skills from resume text.
 */
function extractSkills(text) {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'React', 'React Native', 'Next.js', 'Vue.js', 'Angular',
    'Node.js', 'Express', 'Python', 'FastAPI', 'Django', 'Flask', 'Java', 'Spring Boot',
    'C++', 'C#', '.NET', 'Go', 'Rust', 'Swift', 'Kotlin', 'Flutter',
    'HTML', 'CSS', 'Tailwind CSS', 'SASS', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Git', 'GitHub',
    'REST API', 'GraphQL', 'Microservices', 'System Design', 'Kafka', 'RabbitMQ',
    'Machine Learning', 'TensorFlow', 'PyTorch', 'Gemini AI', 'OpenAI', 'LLMs',
    'Product Management', 'Agile', 'Scrum', 'Leadership', 'Communication',
  ];

  const found = new Set();
  const lowerText = text.toLowerCase();
  for (const skill of commonSkills) {
    const lowerSkill = skill.toLowerCase();
    if (lowerText.includes(lowerSkill)) {
      found.add(skill);
    }
  }

  return Array.from(found).sort();
}

/**
 * Extract experience entries from resume text.
 */
function extractExperience(text) {
  const experience = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const datePattern = /(\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-–—]\s*(\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|Present|Current/gi;

  let currentExp = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(datePattern);
    if (dateMatch && line.length < 100) {
      if (currentExp) {
        experience.push(currentExp);
      }

      currentExp = {
        company: '',
        role: line.trim(),
        startDate: '',
        endDate: '',
        current: /present|current/i.test(line),
        achievements: [],
        skillsUsed: [],
      };

      if (i + 1 < lines.length && lines[i + 1].length > 0 && lines[i + 1].length < 80) {
        currentExp.company = lines[i + 1];
        i++;
      }
    } else if (currentExp && line.length > 0 && line.length < 250) {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./)) {
        currentExp.achievements.push(line.replace(/^[•\-\*\d\.\s]+/, '').trim());
      } else if (!currentExp.company && line.length < 60) {
        currentExp.company = line;
      }
    }
  }

  if (currentExp) {
    experience.push(currentExp);
  }

  return experience.filter((e) => e.company || e.role);
}

/**
 * Extract education entries from resume text.
 */
function extractEducation(text) {
  const education = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const degreeKeywords = ['Bachelor', 'Master', 'PhD', 'B.S.', 'B.A.', 'M.S.', 'M.A.', 'B.Tech', 'M.Tech', 'MBA', 'B.Com', 'M.Com', 'Associate'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasDegree = degreeKeywords.some((k) => line.toLowerCase().includes(k.toLowerCase()));
    if (hasDegree) {
      const edu = {
        degree: line.trim(),
        institution: '',
        startDate: '',
        endDate: '',
        honors: '',
      };

      if (i + 1 < lines.length && lines[i + 1].length < 80) {
        edu.institution = lines[i + 1];
        i++;
      }

      education.push(edu);
    }
  }

  return education;
}

module.exports = {
  extractFromPdf,
  extractFromDocx,
  parseResume,
  extractCareerFields,
  extractCareerFieldsWithAI,
};
