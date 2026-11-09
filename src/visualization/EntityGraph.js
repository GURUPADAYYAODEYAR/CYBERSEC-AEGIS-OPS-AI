import cytoscape from 'cytoscape';

/**
 * Cytoscape.js Entity Relationship Graph for AEGIS OPS AI.
 * Visualizes connection between Users, IPs, Cloud Resources, and Incidents.
 */
export class EntityGraph {
  constructor(containerElement, onNodeSelect) {
    this.container = containerElement;
    this.onNodeSelect = onNodeSelect;
    this.cy = null;
  }

  init(elements = []) {
    if (!this.container) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#F1F5F9' : '#17212F';
    const edgeColor = isDark ? '#3B4D63' : '#CBD5E1';
    const bgSelected = isDark ? '#60A5FA' : '#2563EB';

    this.cy = cytoscape({
      container: this.container,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': textColor,
            'font-size': '11px',
            'font-family': 'Inter, sans-serif',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'background-color': 'data(color)',
            'width': '34px',
            'height': '34px',
            'border-width': 2,
            'border-color': 'data(borderColor)',
            'text-background-opacity': 0,
            'transition-property': 'background-color, border-color, opacity',
            'transition-duration': '0.2s'
          }
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-width': 4,
            'border-color': bgSelected,
            'opacity': 1
          }
        },
        {
          selector: 'node.dimmed',
          style: {
            'opacity': 0.25
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': edgeColor,
            'target-arrow-color': edgeColor,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
            'opacity': 0.7,
            'label': 'data(label)',
            'font-size': '9px',
            'color': isDark ? '#9CAABC' : '#667085',
            'text-rotation': 'autorotate',
            'text-margin-y': -8
          }
        },
        {
          selector: 'edge.highlighted',
          style: {
            'width': 2.5,
            'line-color': bgSelected,
            'target-arrow-color': bgSelected,
            'opacity': 1
          }
        },
        {
          selector: 'edge.dimmed',
          style: {
            'opacity': 0.15
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: false,
        nodeDimensionsIncludeLabels: true,
        padding: 40,
        componentSpacing: 60
      }
    });

    // Handle node selection
    this.cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes();

      this.cy.elements().removeClass('highlighted').addClass('dimmed');
      node.removeClass('dimmed').addClass('highlighted');
      connectedNodes.removeClass('dimmed').addClass('highlighted');
      connectedEdges.removeClass('dimmed').addClass('highlighted');

      if (this.onNodeSelect) {
        this.onNodeSelect(node.data());
      }
    });

    // Clear highlight when tapping background
    this.cy.on('tap', (evt) => {
      if (evt.target === this.cy) {
        this.cy.elements().removeClass('highlighted dimmed');
        if (this.onNodeSelect) {
          this.onNodeSelect(null);
        }
      }
    });
  }

  zoomIn() {
    if (this.cy) this.cy.zoom(this.cy.zoom() * 1.25);
  }

  zoomOut() {
    if (this.cy) this.cy.zoom(this.cy.zoom() * 0.8);
  }

  fit() {
    if (this.cy) this.cy.fit(undefined, 30);
  }

  destroy() {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }

  /**
   * Builds graph elements dataset from stored system records.
   */
  static buildGraphElements({ identities = [], cloudResources = [], incidents = [], events = [] }) {
    const nodes = [];
    const edges = [];
    const addedNodeIds = new Set();

    const addNode = (id, label, type, color, borderColor, rawData = {}) => {
      if (!addedNodeIds.has(id)) {
        addedNodeIds.add(id);
        nodes.push({
          data: { id, label, type, color, borderColor, rawData }
        });
      }
    };

    // 1. Identity Nodes (Blue)
    identities.forEach(u => {
      addNode(u.userId, u.displayName || u.userId, 'USER', '#2563EB', '#1D4ED8', u);
    });

    // 2. Cloud Resource Nodes (Amber/Yellow)
    cloudResources.forEach(res => {
      const color = res.isPublic || res.isOverprivileged ? '#C93C45' : '#D97706';
      addNode(res.resourceId, res.resourceName || res.resourceId, 'CLOUD_RESOURCE', color, '#92400E', res);
      if (res.owner) {
        edges.push({
          data: {
            id: `edge-${res.owner}-${res.resourceId}`,
            source: res.owner,
            target: res.resourceId,
            label: 'owns'
          }
        });
      }
    });

    // 3. IP Nodes & User-IP Authentication Edges
    const seenIpEdges = new Set();
    events.slice(0, 30).forEach(e => {
      if (e.sourceIp && e.sourceIp !== '127.0.0.1') {
        addNode(e.sourceIp, e.sourceIp, 'IP', '#8B5CF6', '#6D28D9', { ip: e.sourceIp, geo: e.metadata?.geo });

        const edgeKey = `edge-${e.userId}-${e.sourceIp}`;
        if (!seenIpEdges.has(edgeKey) && e.userId && addedNodeIds.has(e.userId)) {
          seenIpEdges.add(edgeKey);
          edges.push({
            data: {
              id: edgeKey,
              source: e.userId,
              target: e.sourceIp,
              label: 'accessed_from'
            }
          });
        }
      }
    });

    // 4. Incident Nodes (Red)
    incidents.forEach(inc => {
      addNode(inc.incidentId, inc.incidentId, 'INCIDENT', '#C93C45', '#991B1B', inc);

      // Connect incident to related entities
      (inc.entities || []).forEach(entId => {
        if (addedNodeIds.has(entId)) {
          edges.push({
            data: {
              id: `edge-inc-${inc.incidentId}-${entId}`,
              source: inc.incidentId,
              target: entId,
              label: 'implicates'
            }
          });
        }
      });
    });

    return [...nodes, ...edges];
  }
}
