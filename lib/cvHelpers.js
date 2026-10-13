// Shared helpers for CV content: the three templates and a blank CV shape.

export const TEMPLATES = [
  {
    id: 'modern',
    name: 'Modern Professional',
    description: 'Clean and contemporary with a blue accent bar.',
  },
  {
    id: 'simple',
    name: 'Simple ATS-Friendly',
    description: 'Plain single-column layout that automated systems read easily.',
  },
  {
    id: 'graduate',
    name: 'Graduate / Entry-Level',
    description: 'Leads with education and skills for early-career applicants.',
  },
];

export function templateName(id) {
  const found = TEMPLATES.find((t) => t.id === id);
  return found ? found.name : id;
}

// A blank CV structure. The AI fills the same shape, and the editor edits it.
export function emptyCv() {
  return {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    targetJobTitle: '',
    summary: '',
    skills: [],
    experience: [],
    education: [],
    qualifications: [],
    certificates: [],
    projects: [],
    references: [],
    warnings: [],
  };
}

// Make sure a CV coming from the AI or the database always has every field.
export function normalizeCv(input) {
  const base = emptyCv();
  if (!input || typeof input !== 'object') return base;
  return {
    ...base,
    ...input,
    skills: Array.isArray(input.skills) ? input.skills : [],
    experience: Array.isArray(input.experience) ? input.experience : [],
    education: Array.isArray(input.education) ? input.education : [],
    qualifications: Array.isArray(input.qualifications) ? input.qualifications : [],
    certificates: Array.isArray(input.certificates) ? input.certificates : [],
    projects: Array.isArray(input.projects) ? input.projects : [],
    references: Array.isArray(input.references) ? input.references : [],
    warnings: Array.isArray(input.warnings) ? input.warnings : [],
  };
}
