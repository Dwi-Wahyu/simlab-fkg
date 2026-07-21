// src/lib/types/dashboard.ts

export type DashboardRole =
	| 'superadmin'
	| 'koordinator'
	| 'kepalaLab'
	| 'instruktur'
	| 'peneliti'
	| 'teknisi'
	| 'spmi'
	| 'laboran';

// --- Superadmin ---
export interface SuperadminDashboardData {
	totalUsers: number;
	totalLaboratorium: number;
	recentAuditLogs: {
		id: string;
		action: string;
		tableName: string | null;
		status: string | null;
		createdAt: Date;
		user: { name: string } | null;
	}[];
	inventorySummary: {
		totalEquipment: number;
		baik: number;
		rusak: number;
	};
	activeIncidents: number;
}

// --- Koordinator ---
export interface KoordinatorDashboardData {
	todaySchedules: {
		id: string;
		name: string;
		type: string;
		laboratoriumName: string;
		startTime: Date | null;
		endTime: Date | null;
	}[];
	activeLendings: number;
	pendingApprovals: number;
	maintenanceAlerts: number;
	recentWasteLogs: number;
}

// --- Kepala Lab ---
export interface KepalaLabDashboardData {
	laboratoriumName: string;
	inventorySummary: {
		totalEquipment: number;
		baik: number;
		rusak: number;
		inUse: number;
		maintenance: number;
	};
	pendingLendingApprovals: {
		id: string;
		purpose: string;
		requesterName: string;
		createdAt: Date;
	}[];
	pendingMaintenanceApprovals: number;
	latestInventoryReport: {
		id: string;
		status: string;
		createdAt: Date;
	} | null;
}

// --- Instruktur/Dosen ---
export interface InstrukturDashboardData {
	upcomingSchedules: {
		id: string;
		name: string;
		type: string;
		date: Date | null;
		startTime: Date | null;
		endTime: Date | null;
		laboratoriumName: string;
	}[];
	pendingAssessments: {
		id: string;
		scheduleName: string;
		studentCount: number;
	}[];
	myRecentLogbooks: {
		id: string;
		title: string | null;
		submittedAt: Date | null;
		status: string | null;
	}[];
	totalSchedulesThisMonth: number;
}

// --- Peneliti/Mahasiswa ---
export interface PenelitiDashboardData {
	activeLendings: {
		id: string;
		equipmentName: string;
		dueDate: Date | null;
		status: string;
	}[];
	myLogbooks: {
		id: string;
		seriesName: string;
		lastUpdated: Date | null;
		status: string | null;
	}[];
	upcomingPracticum: {
		id: string;
		name: string;
		date: Date | null;
		laboratoriumName: string;
	}[];
	totalBorrowedThisMonth: number;
	returnAlerts?: {
		id: string;
		dueDate: Date | null;
		items: {
			name: string;
			qty: number;
		}[];
	}[];
}

// --- Teknisi ---
export interface TeknisiDashboardData {
	pendingMaintenance: {
		id: string;
		equipmentName: string;
		maintenanceType: string;
		scheduledDate: Date | null;
		status: string;
	}[];
	upcomingCalibrations: {
		id: string;
		equipmentName: string;
		scheduledDate: Date | null;
	}[];
	equipmentNeedingAttention: {
		id: string;
		name: string;
		condition: string;
		serialNumber: string | null;
	}[];
	completedThisMonth: number;
}

// --- SPMI ---
export interface SpmiDashboardData {
	latestInventoryReports: {
		id: string;
		laboratoriumName: string;
		status: string;
		createdAt: Date;
	}[];
	auditChecklists: {
		id: string;
		laboratoriumName: string;
		completionRate: number;
		createdAt: Date;
	}[];
	safetyIncidents: {
		id: string;
		severity: string;
		status: string;
		createdAt: Date;
		laboratoriumName: string;
	}[];
	calibrationCompliance: {
		total: number;
		calibrated: number;
		percentage: number;
	};
}

// --- Laboran ---
export interface LaboranDashboardData {
	laboratoriumName: string;
	inventorySummary: {
		totalEquipment: number;
		baik: number;
		rusak: number;
		inUse: number;
		maintenance: number;
	};
	latestInventoryReport: {
		id: string;
		status: string;
		createdAt: Date;
	} | null;
	returnAlerts?: {
		id: string;
		dueDate: Date | null;
		borrowerName: string;
		items: {
			name: string;
			qty: number;
		}[];
	}[];
}

// Union type untuk semua dashboard
export type DashboardData =
	| { role: 'superadmin'; data: SuperadminDashboardData }
	| { role: 'koordinator'; data: KoordinatorDashboardData }
	| { role: 'kepalaLab'; data: KepalaLabDashboardData }
	| { role: 'instruktur'; data: InstrukturDashboardData }
	| { role: 'peneliti'; data: PenelitiDashboardData }
	| { role: 'teknisi'; data: TeknisiDashboardData }
	| { role: 'spmi'; data: SpmiDashboardData }
	| { role: 'laboran'; data: LaboranDashboardData };
