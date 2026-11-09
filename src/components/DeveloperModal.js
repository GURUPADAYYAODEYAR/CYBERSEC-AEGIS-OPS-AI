import { renderIcon } from '../utils/icons.js';

/**
 * Developer Profile Modal.
 * Profile: GURUPADAYYA ODEYAR
 */
export class DeveloperModal {
  static render() {
    const existing = document.getElementById('developer-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'developer-modal';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-container" style="max-width: 520px;">
        <div class="modal-header">
          <div class="flex items-center gap-2">
            ${renderIcon('Code', { size: 18, className: 'text-info' })}
            <span class="modal-title">Lead Engineer Profile</span>
          </div>
          <button class="btn btn-subtle btn-xs" id="close-dev-modal">
            ${renderIcon('X', { size: 16 })}
          </button>
        </div>

        <div class="modal-body">
          <div class="dev-profile-card">
            <div class="dev-avatar-row">
              <div class="dev-avatar">GO</div>
              <div class="dev-meta">
                <h3>GURUPADAYYA ODEYAR</h3>
                <p>Principal Cybersecurity Software Engineer & AI Architect</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="badge badge-success">Verified Author</span>
                  <span class="badge badge-neutral">AEGIS OPS AI v1.0</span>
                </div>
              </div>
            </div>

            <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; margin-top: 4px;">
              Designed and engineered <strong>AEGIS OPS AI</strong> as an offline, 100% client-side security operations platform. Features explainable statistical & rule-based threat detection, cross-module correlation, CloudFence posture evaluation, and AgentGuard AI trust boundary defense.
            </p>

            <div class="dev-links">
              <a href="https://github.com/GURUPADAYYAODEYAR" target="_blank" rel="noopener noreferrer" class="dev-link-btn">
                <span class="flex items-center gap-2">
                  ${renderIcon('Github', { size: 16 })}
                  <span>GitHub Profile</span>
                </span>
                <span class="mono text-muted text-xs">@GURUPADAYYAODEYAR ${renderIcon('ExternalLink', { size: 12 })}</span>
              </a>

              <a href="https://www.linkedin.com/in/gurupadayya-odeyar-461732404?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" rel="noopener noreferrer" class="dev-link-btn">
                <span class="flex items-center gap-2">
                  ${renderIcon('Linkedin', { size: 16, color: '#0A66C2' })}
                  <span>LinkedIn Profile</span>
                </span>
                <span class="mono text-muted text-xs">Gurupadayya Odeyar ${renderIcon('ExternalLink', { size: 12 })}</span>
              </a>

              <a href="mailto:gurupadayyaodeyar@gmail.com" class="dev-link-btn">
                <span class="flex items-center gap-2">
                  ${renderIcon('Mail', { size: 16, color: '#EA4335' })}
                  <span>Email Contact</span>
                </span>
                <span class="mono text-muted text-xs">gurupadayyaodeyar@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary btn-sm" id="btn-done-dev-modal">Close Profile</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#close-dev-modal').addEventListener('click', close);
    overlay.querySelector('#btn-done-dev-modal').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }
}

