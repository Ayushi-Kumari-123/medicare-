// Firestore Database Store & Real-time State Synchronization
import { db } from './firebase-config.js';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Initial seed doctors if Firestore 'doctors' collection is empty
const INITIAL_DOCTORS = [
  {
    id: 'doc-1',
    name: 'Dr. Sarah Jenkins, MD',
    specialization: 'Cardiology',
    experienceYears: 14,
    rating: 4.9,
    bio: 'Board-certified cardiologist specializing in preventive cardiology, echocardiography, and hypertension management.',
    avatar: 'SJ',
    availableSlots: ['09:00 AM', '10:30 AM', '01:30 PM', '03:00 PM', '04:30 PM']
  },
  {
    id: 'doc-2',
    name: 'Dr. Michael Chang, MD',
    specialization: 'Dermatology',
    experienceYears: 9,
    rating: 4.8,
    bio: 'Expert dermatologist with clinical focus on skin conditions, acne therapies, and laser dermatological procedures.',
    avatar: 'MC',
    availableSlots: ['09:30 AM', '11:00 AM', '02:00 PM', '03:30 PM']
  },
  {
    id: 'doc-3',
    name: 'Dr. Priya Sharma, MBBS, DM',
    specialization: 'Neurology',
    experienceYears: 16,
    rating: 5.0,
    bio: 'Leading neurologist dedicated to comprehensive care for migraine, sleep disorders, epilepsy, and neurological rehabilitation.',
    avatar: 'PS',
    availableSlots: ['10:00 AM', '11:30 AM', '02:30 PM', '04:00 PM']
  },
  {
    id: 'doc-4',
    name: 'Dr. Robert Taylor, MD',
    specialization: 'Pediatrics',
    experienceYears: 11,
    rating: 4.9,
    bio: 'Compassionate pediatrician focusing on developmental milestones, newborn care, child immunization, and preventative wellness.',
    avatar: 'RT',
    availableSlots: ['08:30 AM', '10:00 AM', '01:00 PM', '02:30 PM']
  },
  {
    id: 'doc-5',
    name: 'Dr. Elena Rostova, MD',
    specialization: 'Orthopedics',
    experienceYears: 13,
    rating: 4.7,
    bio: 'Orthopedic specialist in joint preservation, sports medicine, arthroscopy, and spine health management.',
    avatar: 'ER',
    availableSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM']
  },
  {
    id: 'doc-6',
    name: 'Dr. Marcus Vance, DO',
    specialization: 'General Medicine',
    experienceYears: 8,
    rating: 4.8,
    bio: 'Primary care physician committed to evidence-based preventive health, annual check-ups, and holistic chronic illness care.',
    avatar: 'MV',
    availableSlots: ['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM']
  }
];

// Reactive in-memory caches
let cachedDoctors = [...INITIAL_DOCTORS];
let cachedAppointments = [];
let cachedUsers = [];
let isInitialized = false;

export const Store = {
  async init() {
    if (isInitialized) return;

    try {
      // 1. Subscribe to Doctors collection
      const doctorsCol = collection(db, 'doctors');
      onSnapshot(doctorsCol, async (snapshot) => {
        if (snapshot.empty) {
          // Auto-seed initial doctors to Firestore
          await this._seedDoctors();
        } else {
          cachedDoctors = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          window.dispatchEvent(new CustomEvent('store:updated', { detail: { type: 'doctors' } }));
        }
      }, (err) => {
        console.warn('Doctors snapshot fallback:', err);
      });

      // 2. Subscribe to Appointments collection
      const aptsCol = collection(db, 'appointments');
      onSnapshot(aptsCol, (snapshot) => {
        cachedAppointments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        window.dispatchEvent(new CustomEvent('store:updated', { detail: { type: 'appointments' } }));
      }, (err) => {
        console.warn('Appointments snapshot fallback:', err);
      });

      // 3. Subscribe to Users collection
      const usersCol = collection(db, 'users');
      onSnapshot(usersCol, (snapshot) => {
        cachedUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        window.dispatchEvent(new CustomEvent('store:updated', { detail: { type: 'users' } }));
      }, (err) => {
        console.warn('Users snapshot fallback:', err);
      });

      isInitialized = true;
    } catch (e) {
      console.error('Store init error:', e);
    }
  },

  async _seedDoctors() {
    try {
      for (const docData of INITIAL_DOCTORS) {
        const { id, ...data } = docData;
        await setDoc(doc(db, 'doctors', id), data);
      }
    } catch (err) {
      console.warn('Could not auto-seed doctors into Firestore:', err);
    }
  },

  // Doctors
  getDoctors() {
    return cachedDoctors;
  },

  getDoctorById(id) {
    return cachedDoctors.find(d => d.id === id) || null;
  },

  async saveDoctor(doctorData) {
    try {
      if (doctorData.id) {
        const docRef = doc(db, 'doctors', doctorData.id);
        const { id, ...data } = doctorData;
        await setDoc(docRef, data, { merge: true });
      } else {
        const initials = (doctorData.name || 'DR').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const payload = {
          name: doctorData.name,
          specialization: doctorData.specialization,
          experienceYears: doctorData.experienceYears || 5,
          rating: doctorData.rating || 5.0,
          bio: doctorData.bio || '',
          avatar: initials,
          availableSlots: doctorData.availableSlots || []
        };
        const newRef = await addDoc(collection(db, 'doctors'), payload);
        return newRef.id;
      }
      return true;
    } catch (err) {
      console.error('Error saving doctor to Firestore:', err);
      throw err;
    }
  },

  async deleteDoctor(id) {
    try {
      await deleteDoc(doc(db, 'doctors', id));
      return true;
    } catch (err) {
      console.error('Error deleting doctor from Firestore:', err);
      throw err;
    }
  },

  // Appointments
  getAppointments() {
    return cachedAppointments;
  },

  getAppointmentsByPatient(patientId) {
    return cachedAppointments.filter(a => a.patientId === patientId);
  },

  isSlotBooked(doctorId, date, time) {
    return cachedAppointments.some(
      a => a.doctorId === doctorId && a.date === date && a.time === time && a.status !== 'Cancelled'
    );
  },

  async createAppointment({ patientId, doctorId, date, time, notes = '' }) {
    if (this.isSlotBooked(doctorId, date, time)) {
      throw new Error('This time slot is already booked for the selected date. Please choose another.');
    }

    const payload = {
      patientId,
      doctorId,
      date,
      time,
      status: 'Pending', // Pending, Confirmed, Cancelled
      notes,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = await addDoc(collection(db, 'appointments'), payload);
      const newApt = { id: docRef.id, ...payload };
      return newApt;
    } catch (err) {
      console.error('Error creating appointment in Firestore:', err);
      throw err;
    }
  },

  async updateAppointmentStatus(appointmentId, newStatus) {
    try {
      const aptRef = doc(db, 'appointments', appointmentId);
      await updateDoc(aptRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error('Error updating appointment in Firestore:', err);
      throw err;
    }
  },

  // Patients / Users
  getPatients() {
    return cachedUsers.filter(u => u.role !== 'admin');
  },

  getUserById(id) {
    return cachedUsers.find(u => u.id === id) || null;
  }
};

// Initialize listeners immediately
Store.init();
