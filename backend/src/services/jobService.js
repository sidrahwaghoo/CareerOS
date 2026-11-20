/**
 * Job search service for the agentic Match agent.
 * Provides a `search_jobs` tool that Gemini can call to find relevant
 * job postings based on a query string.
 *
 * In production, this would call a real job board API (Google Jobs,
 * LinkedIn, Indeed, etc.). For now it returns structured sample data
 * that demonstrates the agentic loop works end-to-end.
 */

/**
 * Search for jobs matching a query.
 * @param {string} query - Search query (job title, skills, location)
 * @param {Object} options - Optional filters (location, limit)
 * @returns {Promise<Array>} Array of job objects
 */
async function searchJobs(query, options = {}) {
  const { limit = 5 } = options;

  // Simulate network delay for realism
  await new Promise((resolve) => setTimeout(resolve, 800));

  // In production, replace this with a real API call:
  // - Google Jobs API
  // - LinkedIn Jobs API
  // - Indeed API
  // - Wellfound (AngelList) API
  //
  // Example:
  // const response = await fetch(`https://api.example.com/jobs?q=${encodeURIComponent(query)}`);
  // return response.json();

  const allJobs = [
    {
      id: 'job-1',
      title: 'Senior Frontend Engineer',
      company: 'TechFlow Inc.',
      location: 'Remote (US)',
      description: 'Build responsive web applications using React and TypeScript. Work with design systems and accessibility standards.',
      requiredSkills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS'],
      preferredSkills: ['Next.js', 'Tailwind CSS', 'Accessibility', 'Vitest'],
      experienceLevel: 'Mid-level',
      salary: '$95,000 - $140,000',
      posted: '2 days ago',
    },
    {
      id: 'job-2',
      title: 'Full Stack Developer',
      company: 'DataPulse',
      location: 'Austin, TX',
      description: 'Design and implement full-stack applications using Node.js, PostgreSQL, and React. Collaborate with cross-functional teams on product features.',
      requiredSkills: ['Node.js', 'JavaScript', 'SQL', 'React', 'Git'],
      preferredSkills: ['Express', 'PostgreSQL', 'Redis', 'Docker', 'GitHub Actions'],
      experienceLevel: 'Mid-level',
      salary: '$85,000 - $130,000',
      posted: '1 week ago',
    },
    {
      id: 'job-3',
      title: 'Data Engineer',
      company: 'Insight Analytics',
      location: 'Remote',
      description: 'Build ETL pipelines and data warehouses using Python, SQL, and cloud services. Work with large-scale data processing.',
      requiredSkills: ['Python', 'SQL', 'PostgreSQL', 'ETL', 'Git'],
      preferredSkills: ['AWS', 'Airflow', 'dbt', 'Spark', 'Docker'],
      experienceLevel: 'Mid-level',
      salary: '$100,000 - $150,000',
      posted: '3 days ago',
    },
    {
      id: 'job-4',
      title: 'DevOps Engineer',
      company: 'CloudScale',
      location: 'Seattle, WA',
      description: 'Manage cloud infrastructure, CI/CD pipelines, and container orchestration. Ensure high availability and scalability.',
      requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'],
      preferredSkills: ['Terraform', 'Prometheus', 'Grafana', 'Helm', 'GitHub Actions'],
      experienceLevel: 'Senior',
      salary: '$120,000 - $170,000',
      posted: '1 week ago',
    },
    {
      id: 'job-5',
      title: 'UX/UI Designer',
      company: 'PixelPerfect',
      location: 'Remote (US)',
      description: 'Design user-centered interfaces for web and mobile applications. Collaborate with engineers and product managers.',
      requiredSkills: ['Figma', 'Prototyping', 'User Research', 'Design Systems'],
      preferredSkills: ['React', 'HTML/CSS', 'Accessibility', 'User Testing'],
      experienceLevel: 'Mid-level',
      salary: '$80,000 - $120,000',
      posted: '5 days ago',
    },
  ];

  // Simple keyword matching to simulate relevance
  const queryLower = (query || '').toLowerCase();
  const scored = allJobs
    .map((job) => {
      const haystack = `${job.title} ${job.description} ${job.requiredSkills.join(' ')} ${job.preferredSkills.join(' ')}`.toLowerCase();
      let score = 0;
      const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);
      for (const term of queryTerms) {
        if (haystack.includes(term)) score += 10;
      }
      return { ...job, score };
    })
    .filter((j) => j.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // If no keyword matches, return a few general results
  if (scored.length === 0) {
    return allJobs.slice(0, Math.min(limit, 3));
  }

  return scored;
}

module.exports = {
  searchJobs,
};
