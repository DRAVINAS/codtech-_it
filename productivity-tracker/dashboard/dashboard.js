class ProductivityDashboard {
    constructor() {
        this.charts = {};
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        await this.loadDashboard();
    }

    async checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        this.token = token;
    }

    setupEventListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = '/login.html';
        });
    }

    async loadDashboard() {
        try {
            await Promise.all([
                this.loadUserInfo(),
                this.loadStats(),
                this.loadCharts(),
                this.loadTopSites(),
                this.loadRecentActivity()
            ]);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async loadUserInfo() {
        // Replace with your actual user info endpoint if available
        // For now, just show token as placeholder
        document.getElementById('user-email').textContent = this.token ? 'Logged In' : 'Guest';
    }

    async loadStats() {
        const response = await fetch('http://localhost:5000/analytics/today', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const stats = await response.json();

        document.getElementById('today-total').textContent = this.formatDuration(stats.totalTime);
        document.getElementById('today-productive').textContent = this.formatDuration(stats.productiveTime);
        document.getElementById('today-unproductive').textContent = this.formatDuration(stats.unproductiveTime);

        const productivityScore = stats.totalTime > 0
            ? Math.round((stats.productiveTime / stats.totalTime) * 100)
            : 0;
        document.getElementById('productivity-score').textContent = `${productivityScore}%`;
    }

    async loadCharts() {
        await Promise.all([
            this.createWeeklyChart(),
            this.createTopSitesChart()
        ]);
    }

    async createWeeklyChart() {
        const response = await fetch('http://localhost:5000/analytics/weekly', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const data = await response.json();

        const ctx = document.getElementById('weekly-chart').getContext('2d');
        this.charts.weekly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d._id).toLocaleDateString('en-US', { weekday: 'short' })),
                datasets: [
                    {
                        label: 'Total Time',
                        data: data.map(d => d.totalTime / 60),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Productive Time',
                        data: data.map(d => d.productiveTime / 60),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    }
                }
            }
        });
    }

    async createTopSitesChart() {
        const response = await fetch('http://localhost:5000/analytics/top-sites', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const data = await response.json();

        const ctx = document.getElementById('top-sites-chart').getContext('2d');
        this.charts.topSites = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.domain),
                datasets: [{
                    data: data.map(d => d.totalTime / 60),
                    backgroundColor: [
                        '#6366f1',
                        '#8b5cf6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    async loadTopSites() {
        const response = await fetch('http://localhost:5000/analytics/top-sites', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const sites = await response.json();

        const container = document.getElementById('top-sites-table');
        container.innerHTML = sites.map(site => `
            <div class="site-item">
                <span class="site-name">${site.domain}</span>
                <span class="site-time">${this.formatDuration(site.totalTime)}</span>
            </div>
        `).join('');
    }

    async loadRecentActivity() {
        // Replace with your actual recent activity endpoint if available
        // For now, just show empty
        const container = document.getElementById('recent-sessions');
        container.innerHTML = `<div>No recent activity available.</div>`;
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    showError(message) {
        const container = document.querySelector('.dashboard-container');
        container.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProductivityDashboard();
});