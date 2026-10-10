import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderHome, initHomeEvents } from './views/home.js';
import { renderAuth, initAuthEvents } from './views/auth.js';
import { renderDoctorList, initDoctorListEvents } from './views/doctors.js';
import { renderBookAppointment, initBookAppointmentEvents } from './views/book.js';
import { renderPatientDashboard, initPatientDashboardEvents } from './views/patientDashboard.js';
import { renderAdminDashboard, initAdminDashboardEvents } from './views/adminDashboard.js';

export function parseHash() {
  const hash = window.location.hash.slice(1) || 'home';
  const [route, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  return { route, params };
}

export function handleRoute() {
  const { route, params } = parseHash();
  const navContainer = document.getElementById('navbar-app');
  const appContainer = document.getElementById('app');

  // Update Navbar
  if (navContainer) {
    navContainer.innerHTML = renderNavbar(route);
    initNavbarEvents();
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Route Dispatcher
  switch (route) {
    case 'home':
    case '':
      appContainer.innerHTML = renderHome();
      initHomeEvents();
      break;

    case 'auth':
      appContainer.innerHTML = renderAuth();
      initAuthEvents();
      break;

    case 'doctors':
      const search = params.get('search') || '';
      const specialty = params.get('specialty') || '';
      appContainer.innerHTML = renderDoctorList(search, specialty);
      initDoctorListEvents(search, specialty);
      break;

    case 'book':
      const doctorId = params.get('doctorId');
      appContainer.innerHTML = renderBookAppointment(doctorId);
      initBookAppointmentEvents(doctorId);
      break;

    case 'patient-dashboard':
      appContainer.innerHTML = renderPatientDashboard();
      initPatientDashboardEvents();
      break;

    case 'admin-dashboard':
      appContainer.innerHTML = renderAdminDashboard();
      initAdminDashboardEvents();
      break;

    default:
      appContainer.innerHTML = `
        <div class="container" style="text-align: center; padding: 4rem 1rem;">
          <h1 style="font-size: 3rem; margin-bottom: 0.5rem;">404</h1>
          <p style="color: var(--text-muted); margin-bottom: 2rem;">The requested page does not exist.</p>
          <a href="#home" class="btn btn-primary">Return Home</a>
        </div>
      `;
      break;
  }
}
