import { renderIcon } from '../utils/icons.js';
import { Chart, registerables } from 'chart.js';
import { SecurityCharts } from '../visualization/SecurityCharts.js';
import {
  EventsRepository,
  AlertsRepository,
  IncidentsRepository,
  IdentitiesRepository,
  CloudResourcesRepository
} from '../storage/repositories.js';

Chart.register(...registerables);

export class AnalyticsPage {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.charts = [];
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Security Analytics & Telemetry Metrics</h1>
            <p>Comprehensive statistical breakdown across identity anomalies, cloud posture, and incident velocity.</p>
          </div>
        </div>

        <!-- Row 1: Event Volume & Severity Distribution -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
          <div class="card" style="min-height: 280px; display: flex; flex-direction: column;">
            <div class="card-header">
              <span class="card-title">
                ${renderIcon('Activity', { size: 16, className: 'text-info' })}
                <span>Event Ingress Timeline</span>
              </span>
            </div>
            <div style="flex: 1; position: relative;">
              <canvas id="chart-event-volume"></canvas>
            </div>
          </div>

          <div class="card" style="min-height: 280px; display: flex; flex-direction: column;">
            <div class="card-header">
              <span class="card-title">
                ${renderIcon('Shield', { size: 16, className: 'text-warning' })}
                <span>Severity Distribution</span>
              </span>
            </div>
            <div style="flex: 1; position: relative;">
              <canvas id="chart-severity-doughnut"></canvas>
            </div>
          </div>
        </div>

        <!-- Row 2: Category Bar & Auth Outcomes -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="card" style="min-height: 280px; display: flex; flex-direction: column;">
            <div class="card-header">
              <span class="card-title">
                ${renderIcon('ShieldAlert', { size: 16, className: 'text-critical' })}
                <span>Threat Category Distribution</span>
              </span>
            </div>
            <div style="flex: 1; position: relative;">
              <canvas id="chart-category-bar"></canvas>
            </div>
          </div>

          <div class="card" style="min-height: 280px; display: flex; flex-direction: column;">
            <div class="card-header">
              <span class="card-title">
                ${renderIcon('Users', { size: 16, className: 'text-success' })}
                <span>Authentication Outcomes (Success vs Failure)</span>
              </span>
            </div>
            <div style="flex: 1; position: relative;">
              <canvas id="chart-auth-outcomes"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.initCharts(container);
  }

  async initCharts(container) {
    const [events, alerts, incidents] = await Promise.all([
      EventsRepository.getAll(),
      AlertsRepository.getAll(),
      IncidentsRepository.getAll()
    ]);

    const colors = SecurityCharts.getThemeColors();

    // 1. Event Volume Chart
    const c1 = container.querySelector('#chart-event-volume');
    if (c1) {
      const chart1 = SecurityCharts.renderEventActivityChart(c1, events);
      if (chart1) this.charts.push(chart1);
    }

    // 2. Severity Doughnut
    const c2 = container.querySelector('#chart-severity-doughnut');
    if (c2) {
      const chart2 = SecurityCharts.renderSeverityDoughnut(c2, alerts);
      if (chart2) this.charts.push(chart2);
    }

    // 3. Category Bar
    const c3 = container.querySelector('#chart-category-bar');
    if (c3) {
      const chart3 = SecurityCharts.renderCategoryBar(c3, alerts);
      if (chart3) this.charts.push(chart3);
    }

    // 4. Auth Outcomes Doughnut
    const c4 = container.querySelector('#chart-auth-outcomes');
    if (c4) {
      const authEvents = events.filter(e => e.eventType === 'AUTHENTICATION');
      const successes = authEvents.filter(e => e.outcome === 'SUCCESS').length;
      const failures = authEvents.filter(e => e.outcome === 'FAILURE').length;

      const chart4 = new Chart(c4, {
        type: 'doughnut',
        data: {
          labels: ['Successful Logins', 'Failed Attempts'],
          datasets: [{
            data: [successes || 5, failures || 3],
            backgroundColor: [colors.success, colors.critical],
            borderWidth: 2,
            borderColor: colors.surface
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: colors.textColor, boxWidth: 12, font: { size: 11 } }
            }
          }
        }
      });
      this.charts.push(chart4);
    }
  }

  destroy() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }
}
