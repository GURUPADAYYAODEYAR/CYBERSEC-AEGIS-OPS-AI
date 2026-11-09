import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

/**
 * Chart.js Helper for AEGIS OPS AI.
 * strictly uses solid colors, responsive scaling, and supports both Light and Dark mode.
 */

export class SecurityCharts {
  static getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      textColor: isDark ? '#9CAABC' : '#667085',
      gridColor: isDark ? '#2A384A' : '#E4E7EC',
      accentPrimary: isDark ? '#60A5FA' : '#2563EB',
      critical: isDark ? '#F17D85' : '#C93C45',
      warning: isDark ? '#F2C46B' : '#B7791F',
      success: isDark ? '#4BD6A2' : '#16845B',
      info: isDark ? '#38BDF8' : '#0284C7',
      surface: isDark ? '#182231' : '#FFFFFF'
    };
  }

  /**
   * Renders Event Activity Over Time chart.
   */
  static renderEventActivityChart(canvas, events) {
    if (!canvas) return null;

    // Group events into hourly buckets
    const buckets = {};
    for (const evt of events) {
      const timeKey = evt.timestamp.substring(11, 16); // HH:MM
      buckets[timeKey] = (buckets[timeKey] || 0) + 1;
    }

    const labels = Object.keys(buckets).slice(-10);
    const data = labels.map(l => buckets[l]);

    const colors = this.getThemeColors();

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['08:00', '08:15', '08:30', '08:45', '09:00'],
        datasets: [{
          label: 'Security Events',
          data: data.length > 0 ? data : [2, 5, 12, 4, 3],
          backgroundColor: colors.accentPrimary,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { size: 11 } }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, font: { size: 11 }, precision: 0 }
          }
        }
      }
    });
  }

  /**
   * Renders Findings by Severity breakdown doughnut.
   */
  static renderSeverityDoughnut(canvas, alerts) {
    if (!canvas) return null;

    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const alert of alerts) {
      const sev = String(alert.severity || 'LOW').toUpperCase();
      if (counts[sev] !== undefined) counts[sev]++;
      else counts.LOW++;
    }

    const colors = this.getThemeColors();

    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [counts.CRITICAL, counts.HIGH, counts.MEDIUM, counts.LOW],
          backgroundColor: [colors.critical, '#E05D52', colors.warning, colors.info],
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
  }

  /**
   * Renders Threat Categories Horizontal Bar.
   */
  static renderCategoryBar(canvas, alerts) {
    if (!canvas) return null;

    const catCounts = {};
    for (const alert of alerts) {
      const cat = alert.ruleId?.split('_')[0] || 'GENERAL';
      const catName = cat === 'AUTH' ? 'Identity' : cat === 'CLOUD' ? 'Cloud' : cat === 'AGENT' ? 'AI Agent' : cat === 'STAT' ? 'Statistical' : 'Behavioral';
      catCounts[catName] = (catCounts[catName] || 0) + 1;
    }

    const labels = Object.keys(catCounts);
    const data = labels.map(l => catCounts[l]);

    const colors = this.getThemeColors();

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['Identity', 'Cloud', 'AI Agent', 'Behavioral'],
        datasets: [{
          label: 'Alerts',
          data: data.length > 0 ? data : [4, 3, 1, 1],
          backgroundColor: [colors.critical, colors.accentPrimary, colors.warning, colors.info],
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, font: { size: 11 }, precision: 0 }
          },
          y: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { size: 11 } }
          }
        }
      }
    });
  }
}
