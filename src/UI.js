// ─────────────────────────────────────────────────────────────
//  UI — panel rendering for each portfolio section
// ─────────────────────────────────────────────────────────────
import { PORTFOLIO } from './data.js';

const panel      = document.getElementById('panel');
const panelInner = document.getElementById('panel-inner');
const closeBtn   = document.getElementById('panel-close');

closeBtn.addEventListener('click', () => hide());

export function show(section) {
  panelInner.innerHTML = buildSection(section);
  panel.classList.remove('hidden');
  // Force reflow to trigger CSS transition
  panel.offsetHeight;
  panel.classList.add('visible');
}

export function hide() {
  panel.classList.remove('visible');
  setTimeout(() => panel.classList.add('hidden'), 380);
}

function buildSection(section) {
  switch (section) {
    case 'loco':      return buildLoco();
    case 'about':     return buildAbout();
    case 'skills':    return buildSkills();
    case 'projects':  return buildProjects();
    case 'interests': return buildInterests();
    case 'contact':   return buildContact();
    default:          return '<p>Section not found.</p>';
  }
}

// ── Locomotive (intro) ────────────────────────────────────────
function buildLoco() {
  return `
    <h2>🚂 ${PORTFOLIO.name}</h2>
    <h3>${PORTFOLIO.title}</h3>
    <p style="margin-top:1rem">${PORTFOLIO.tagline}</p>
    <div class="tag-list" style="margin-top:1.5rem">
      <span class="tag">Available for work</span>
      <span class="tag">Open to remote</span>
      <span class="tag">CC0 assets</span>
    </div>
    <p style="margin-top:1.5rem;font-size:0.82rem;opacity:0.5">
      Click the coaches below to explore each section →
    </p>
  `;
}

// ── About ─────────────────────────────────────────────────────
function buildAbout() {
  return `
    <h2>👤 About Me</h2>
    <p style="margin-top:1rem;line-height:1.8">${PORTFOLIO.about}</p>
    <h3>Quick Facts</h3>
    <div class="tag-list">
      <span class="tag">📍 Remote-first</span>
      <span class="tag">🎓 CS Graduate</span>
      <span class="tag">⏱ 5+ years exp</span>
      <span class="tag">🌐 Fullstack</span>
    </div>
  `;
}

// ── Skills ────────────────────────────────────────────────────
function buildSkills() {
  const bars = PORTFOLIO.skills.map(s => `
    <div class="skill-bar-wrap">
      <div class="skill-bar-label">
        <span>${s.name}</span><span>${s.level}%</span>
      </div>
      <div class="skill-bar-bg">
        <div class="skill-bar-fill" style="width:${s.level}%"></div>
      </div>
    </div>
  `).join('');
  return `<h2>💻 Skills</h2><div style="margin-top:1.2rem">${bars}</div>`;
}

// ── Projects ──────────────────────────────────────────────────
function buildProjects() {
  const cards = PORTFOLIO.projects.map(p => {
    const tech = p.tech.map(t => `<span class="tag">${t}</span>`).join('');
    return `
      <div class="project-card">
        <h4>${p.title}</h4>
        <p>${p.description}</p>
        <div class="tag-list tech">${tech}</div>
        ${p.link !== '#' ? `<a href="${p.link}" target="_blank" style="font-size:0.8rem;color:var(--accent);margin-top:0.6rem;display:inline-block">View →</a>` : ''}
      </div>
    `;
  }).join('');
  return `<h2>🚀 Projects</h2><div style="margin-top:1rem">${cards}</div>`;
}

// ── Interests ─────────────────────────────────────────────────
function buildInterests() {
  const cards = PORTFOLIO.interests.map(i => `
    <div class="interest-card">
      <span class="emoji">${i.emoji}</span>
      ${i.label}
    </div>
  `).join('');
  return `
    <h2>🎯 Interests</h2>
    <div class="interest-grid">${cards}</div>
  `;
}

// ── Contact ───────────────────────────────────────────────────
function buildContact() {
  const { email, github, linkedin, twitter } = PORTFOLIO.contact;
  return `
    <h2>📬 Contact</h2>
    <p style="margin:0.8rem 0 1.4rem;opacity:0.7">Let's build something great together.</p>
    <a href="mailto:${email}" class="contact-link">
      <span class="icon">✉️</span> ${email}
    </a>
    <a href="${github}" target="_blank" class="contact-link">
      <span class="icon">🐙</span> GitHub
    </a>
    <a href="${linkedin}" target="_blank" class="contact-link">
      <span class="icon">💼</span> LinkedIn
    </a>
    <a href="${twitter}" target="_blank" class="contact-link">
      <span class="icon">🐦</span> Twitter / X
    </a>
  `;
}
