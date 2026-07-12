import {
	mysqlTable,
	varchar,
	text,
	timestamp,
	int,
	boolean,
	mysqlEnum,
	index,
	uniqueIndex,
	unique,
	foreignKey,
	json,
	date
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { laboratorium, user, laboratoriumMember, session, account, apiKey } from './auth.schema';

export const auditLog = mysqlTable('audit_log', {
	id: varchar('id', { length: 36 }).primaryKey(),

	userId: varchar('user_id', { length: 36 }).references(() => user.id),

	action: varchar('action', { length: 50 }),
	tableName: varchar('table_name', { length: 50 }),

	recordId: varchar('record_id', { length: 36 }),

	oldValue: text('old_value'),
	newValue: text('new_value'),

	status: varchar('status', { length: 20 }), // 'SUCCESS', 'FAILED'
	ipAddress: varchar('ip_address', { length: 45 }),
	userAgent: text('user_agent'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const notificationPriorityEnum = mysqlEnum('notification_priority', [
	'LOW',
	'MEDIUM',
	'HIGH'
]);

export const notification = mysqlTable(
	'notification',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		// Target: can be specific user OR specific laboratorium
		userId: varchar('user_id', { length: 36 }).references(() => user.id, { onDelete: 'cascade' }),
		laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id, {
			onDelete: 'cascade'
		}),

		title: varchar('title', { length: 255 }).notNull(),
		body: text('body').notNull(),

		priority: notificationPriorityEnum.default('MEDIUM').notNull(),

		read: boolean('read').default(false).notNull(),

		// Action metadata (JSON)
		// Example: { "type": "PEMINJAMAN_DETAIL", "resourceId": "...", "webPath": "...", "mobilePath": "..." }
		action: text('action'),

		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('notification_userId_idx').on(table.userId),
		index('notification_laboratoriumId_idx').on(table.laboratoriumId),
		index('notification_read_idx').on(table.read)
	]
);

export const warehouse = mysqlTable('warehouse', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	location: text('location'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const equipmentCategory = mysqlTable('equipment_category', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull().unique(), // "Gunting"
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const equipmentCategoryRelations = relations(equipmentCategory, ({ many }) => ({
	items: many(item)
}));

export const equipment = mysqlTable(
	'equipment',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		serialNumber: varchar('serial_number', { length: 100 }).unique(),
		brand: varchar('brand', { length: 100 }),
		variant: varchar('variant', { length: 255 }),

		warehouseId: varchar('warehouse_id', { length: 36 }).references(() => warehouse.id),

		laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id),

		itemId: varchar('item_id', { length: 36 })
			.notNull()
			.references(() => item.id), // Ensure item.type = 'ASSET'

		condition: mysqlEnum('condition', ['BAIK', 'RUSAK'])
			.default('BAIK')
			.notNull(),

		status: mysqlEnum('status', ['READY', 'IN_USE', 'MAINTENANCE']).default('READY'),
		storageLocation: varchar('storage_location', { length: 255 }),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('equipment_condition_idx').on(table.condition),
		index('equipment_item_id_idx').on(table.itemId) // Add index for itemId
	]
);

export const item = mysqlTable('item', {
	id: varchar('id', { length: 36 }).primaryKey(),
	categoryId: varchar('category_id', { length: 36 }).references(() => equipmentCategory.id),

	name: varchar('name', { length: 255 }).notNull(),

	type: mysqlEnum('type', ['ASSET', 'CONSUMABLE']).notNull(), // ASSET = individual, CONSUMABLE = quantity-based

	// Only applicable if type is ASSET
	equipmentType: mysqlEnum('equipment_type', [
		'DENTAL_UNIT',
		'LAB_INSTRUMENT',
		'IMAGING',
		'FURNITURE',
		'INSTRUMENT',
		'EQUIPMENT'
	]),

	minStock: int('min_stock').default(0),
	qrCodePath: text('qr_code_path'),

	baseUnit: mysqlEnum('base_unit', ['PCS', 'BOX', 'METER', 'ROLL', 'UNIT', 'BOTOL']).notNull(),

	description: text('description'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const itemUnitConversion = mysqlTable(
	'item_unit_conversion',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		itemId: varchar('item_id', { length: 36 }).references(() => item.id, { onDelete: 'cascade' }),

		fromUnit: varchar('from_unit', { length: 20 }).notNull(), // BOX
		toUnit: varchar('to_unit', { length: 20 }).notNull(), // PCS

		multiplier: int('multiplier').notNull() // 10
	},
	(table) => [unique().on(table.itemId, table.fromUnit, table.toUnit)]
);

export const stock = mysqlTable(
	'stock',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		itemId: varchar('item_id', { length: 36 }).references(() => item.id, { onDelete: 'cascade' }),

		warehouseId: varchar('warehouse_id', { length: 36 }).references(() => warehouse.id, {
			onDelete: 'cascade'
		}),

		qty: int('qty').default(0).notNull(),

		brand: varchar('brand', { length: 100 }),
		variant: varchar('variant', { length: 255 }),
		laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id),
		condition: varchar('condition', { length: 100 }).default('baik'),

		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
	},

	(table) => [
		index('stock_item_idx').on(table.itemId),
		uniqueIndex('stock_unique_idx').on(table.itemId, table.laboratoriumId, table.brand, table.variant)
	]
);

export const stockBatch = mysqlTable(
	'stock_batch',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		stockId: varchar('stock_id', { length: 36 })
			.notNull()
			.references(() => stock.id, { onDelete: 'cascade' }),

		// Remaining quantity in this batch (decremented on ISSUE/ADJUSTMENT, never negative)
		qty: int('qty').notNull().default(0),

		// Quantity originally received in this batch — kept for audit/history, never mutated after insert
		initialQty: int('initial_qty').notNull(),

		// Nullable: not every BHP item is perishable (e.g. non-expiring lab hardware consumables)
		expiryDate: date('expiry_date'),

		// "Tanggal Masuk" — always set to now() at insert time by the server, never user-editable
		receivedAt: timestamp('received_at').defaultNow().notNull(),

		// Optional link back to the movement row that created this batch, for traceability
		movementId: varchar('movement_id', { length: 36 }).references(() => movement.id),

		notes: text('notes'),

		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('stock_batch_stock_idx').on(table.stockId),
		index('stock_batch_expiry_idx').on(table.expiryDate)
	]
);

export const stockBatchRelations = relations(stockBatch, ({ one }) => ({
	stock: one(stock, {
		fields: [stockBatch.stockId],
		references: [stock.id]
	}),
	movement: one(movement, {
		fields: [stockBatch.movementId],
		references: [movement.id]
	})
}));

export const movementEventTypeEnum = mysqlEnum('movement_event_type', [
	'RECEIVE', // Incoming stock/equipment (IN, MASUK)
	'ISSUE', // Outgoing stock/equipment (OUT, KELUAR)
	'ADJUSTMENT', // Stock adjustment
	'TRANSFER_OUT', // Transfer out of a warehouse/org
	'TRANSFER_IN', // Transfer into a warehouse/org
	'LENDING_OUT', // Equipment loaned out (PINJAM)
	'LENDING_RETURN', // Equipment returned from loan (KEMBALI)
	'MAINTENANCE_IN', // Equipment sent for maintenance
	'MAINTENANCE_OUT' // Equipment returned from maintenance
]);

export const movementClassificationEnum = mysqlEnum('movement_classification', [
	'GUDANG_PUSAT',
	'LAB_UNIT',
	'VENDOR_REPAIR'
]);

export const movementReferenceTypeEnum = mysqlEnum('movement_reference_type', [
	'LENDING',
	'DISTRIBUTION',
	'MAINTENANCE'
]);

export const movement = mysqlTable(
	'movement',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// Link to either item (for consumables) or equipment (for assets)
		itemId: varchar('item_id', { length: 36 }).references(() => item.id),
		equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id),

		// Type of movement event
		eventType: movementEventTypeEnum.notNull(),

		// Quantity for consumable items (default 1 for assets)
		qty: int('qty').notNull().default(1),

		// Unit for consumable items (e.g., "PCS", "BOX")
		unit: varchar('unit', { length: 20 }),

		// Classification for asset movements (BALKIR, KOMUNITY, TRANSITO)
		classification: movementClassificationEnum,

		// Specific location name (e.g., "Truk Ekspedisi A", "Yonif 201")
		specificLocationName: varchar('specific_location_name', { length: 255 }),

		// Source and Destination warehouses for transfers/movements
		fromWarehouseId: varchar('from_warehouse_id', { length: 36 }).references(() => warehouse.id),
		toWarehouseId: varchar('to_warehouse_id', { length: 36 }).references(() => warehouse.id),

		// Laboratorium initiating or affected by the movement
		laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id),

		notes: text('notes'), // Combines description/keterangan/note

		picId: varchar('pic_id', { length: 36 }).references(() => user.id), // Person in Charge (createdBy, penanggungJawab)

		// Reference to other transactions
		referenceType: movementReferenceTypeEnum,
		referenceId: varchar('reference_id', { length: 36 }),

		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('movement_item_idx').on(table.itemId),
		index('movement_equipment_idx').on(table.equipmentId),
		index('movement_from_warehouse_idx').on(table.fromWarehouseId),
		index('movement_to_warehouse_idx').on(table.toWarehouseId),
		index('movement_laboratorium_idx').on(table.laboratoriumId),
		index('movement_reference_idx').on(table.referenceId)
	]
);

export const maintenance = mysqlTable('maintenance', {
	id: varchar('id', { length: 36 }).primaryKey(),
	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id, {
		onDelete: 'cascade'
	}),

	maintenanceType: mysqlEnum('maintenance_type', ['PREVENTIF', 'KOREKTIF', 'KALIBRASI']).notNull(),
	description: text('description').notNull(),
	scheduledDate: timestamp('scheduled_date').notNull(),
	completionDate: timestamp('completion_date'),

	status: mysqlEnum('status', ['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING').notNull(),
	technicianId: varchar('technician_id', { length: 36 }).references(() => user.id),

	vendor: varchar('vendor', { length: 255 }),
	expiryDate: timestamp('expiry_date'),
	certificatePath: text('certificate_path'),
	certificateName: varchar('certificate_name', { length: 255 }),

	notaFileName: varchar('nota_file_name', { length: 255 }),

	cost: int('cost').default(0),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const maintenanceCost = mysqlTable('maintenance_cost', {
	id: varchar('id', { length: 36 }).primaryKey(),
	maintenanceId: varchar('maintenance_id', { length: 36 }).references(() => maintenance.id, {
		onDelete: 'set null'
	}),
	name: varchar('name', { length: 255 }).notNull(),
	amount: int('amount').notNull().default(0), // Total amount
	status: mysqlEnum('status', ['LUNAS', 'MENUNGGU_PEMBAYARAN'])
		.default('MENUNGGU_PEMBAYARAN')
		.notNull(),
	dueDate: timestamp('due_date'),
	attachmentPath: text('attachment_path'),
	attachmentName: varchar('attachment_name', { length: 255 }),
	notes: text('notes'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const maintenanceCostItem = mysqlTable('maintenance_cost_item', {
	id: varchar('id', { length: 36 }).primaryKey(),
	costId: varchar('cost_id', { length: 36 }).references(() => maintenanceCost.id, {
		onDelete: 'cascade'
	}),
	name: varchar('name', { length: 255 }).notNull(),
	amount: int('amount').notNull().default(0),
	notes: text('notes'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const lending = mysqlTable('lending', {
	id: varchar('id', { length: 36 }).primaryKey(),

	unit: varchar('unit', { length: 100 }).notNull(),
	purpose: mysqlEnum('purpose', [
		'PRAKTIKUM',
		'PENELITIAN_DOSEN',
		'PENGABDIAN_MASYARAKAT'
	]).notNull(),

	surat: text('surat'),
	nomorSurat: varchar('nomor_surat', { length: 255 }),

	status: mysqlEnum('status', ['DRAFT', 'APPROVED', 'REJECTED', 'DIPINJAM', 'RETURNED']).default(
		'DRAFT'
	),
	rejectedReason: text('rejected_reason'),

	requestedBy: varchar('requested_by', { length: 36 }).references(() => user.id),
	laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id),

	approvedBy: varchar('approved_by', { length: 36 }).references(() => user.id),

	attachmentPath: text('attachment_path'),
	attachmentName: varchar('attachment_name', { length: 255 }),

	startDate: timestamp('start_date').notNull(),
	endDate: timestamp('end_date'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const lendingItem = mysqlTable('lending_item', {
	id: varchar('id', { length: 36 }).primaryKey(),

	lendingId: varchar('lending_id', { length: 36 }).references(() => lending.id, {
		onDelete: 'cascade'
	}),

	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id),

	qty: int('qty').default(1),

	// Return data
	returnStatus: mysqlEnum('return_status', ['BAIK', 'RUSAK']),
	returnNotes: text('return_notes'),
	returnEvidencePath: text('return_evidence_path'),
	returnedAt: timestamp('returned_at')
});

export const approval = mysqlTable('approval', {
	id: varchar('id', { length: 36 }).primaryKey(),

	referenceType: mysqlEnum('reference_type', ['LENDING', 'DISTRIBUTION', 'MAINTENANCE']),

	referenceId: varchar('reference_id', { length: 36 }),

	approvedBy: varchar('approved_by', { length: 36 }).references(() => user.id),

	status: mysqlEnum('status', ['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),

	note: text('note'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const inventoryReport = mysqlTable('inventory_report', {
	id: varchar('id', { length: 36 }).primaryKey(),
	laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id),

	periodMonth: int('period_month'), // 1-12
	periodYear: int('period_year'), // 2026

	itemId: varchar('item_id', { length: 36 }).references(() => item.id),

	openingQty: int('opening_qty'), // Stok awal bulan
	inQty: int('in_qty'), // Total masuk (dari movement)
	outQty: int('out_qty'), // Total keluar (dari movement)
	closingQty: int('closing_qty'), // Stok akhir bulan

	status: mysqlEnum('status', ['DRAFT', 'SIGNED_BY_KEPALA_LAB', 'SUBMITTED_TO_SPMI']),
	createdAt: timestamp('created_at').defaultNow()
});

export const auditChecklist = mysqlTable('audit_checklist', {
	id: varchar('id', { length: 36 }).primaryKey(),
	nama: varchar('nama', { length: 255 }).notNull(),
	institusi: varchar('institusi', { length: 255 }).notNull(),
	tanggal: date('tanggal').notNull(),
	deskripsi: text('deskripsi'),
	sertifikat: varchar('sertifikat', { length: 255 }),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const wasteLog = mysqlTable('waste_log', {
	id: varchar('id', { length: 36 }).primaryKey(),
	laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id),

	wasteType: mysqlEnum('waste_type', ['INFEKSIUS', 'TAJAM', 'KIMIA', 'RADIOAKTIF']).notNull(),
	weightGram: int('weight_gram').notNull(),

	picId: varchar('pic_id', { length: 36 }).references(() => user.id), // Siapa yang membuang

	disposalStatus: mysqlEnum('disposal_status', [
		'STORED',
		'COLLECTED_BY_THIRD_PARTY',
		'INCINERATED'
	]),
	notes: text('notes'),
	createdAt: timestamp('created_at').defaultNow()
});

export const safetyIncidentSeverityEnum = mysqlEnum('safety_incident_severity', [
	'LOW',
	'MEDIUM',
	'HIGH'
]);

export const safetyIncidentStatusEnum = mysqlEnum('safety_incident_status', [
	'REPORTED',
	'INVESTIGATING',
	'ACTION_PLAN',
	'MONITORING',
	'CLOSED'
]);

export const safetyIncident = mysqlTable('safety_incident', {
	id: varchar('id', { length: 36 }).primaryKey(),
	laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id),

	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	incidentDate: timestamp('incident_date').notNull(),

	severity: safetyIncidentSeverityEnum.notNull(),

	reporterName: varchar('reporter_name', { length: 255 }), // Input teks as requested

	capa: text('capa'), // Corrective and Preventive Action status or text

	status: safetyIncidentStatusEnum.default('REPORTED').notNull(),

	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').onUpdateNow()
});

export const practicumTypeEnum = mysqlEnum('practicum_type', ['PELATIHAN', 'OSCE', 'PRAKTIKUM']);
export const practicumClassEnum = mysqlEnum('practicum_class', ['A', 'B', 'C']);

export const practicumClass = mysqlTable(
	'practicum_class',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 255 }).notNull(), // "REGULER A", "INTERNASIONAL"
		batch: varchar('batch', { length: 4 }).notNull(), // "2024"
		academicYear: varchar('academic_year', { length: 20 }).notNull(), // "2024/2025"
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [uniqueIndex('practicum_class_unique_idx').on(table.batch, table.name)]
);

export const practicumClassMember = mysqlTable(
	'practicum_class_member',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		classId: varchar('class_id', { length: 36 })
			.notNull()
			.references(() => practicumClass.id, { onDelete: 'cascade' }),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('practicum_class_member_class_idx').on(table.classId),
		index('practicum_class_member_user_idx').on(table.userId),
		uniqueIndex('practicum_class_member_unique_idx').on(table.classId, table.userId)
	]
);

export const kelompokMahasiswa = mysqlTable(
	'kelompok_mahasiswa',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: varchar('name', { length: 255 }).notNull(), // "Kelompok 1"
		classId: varchar('class_id', { length: 36 })
			.notNull()
			.references(() => practicumClass.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('kelompok_mahasiswa_class_idx').on(table.classId),
		uniqueIndex('kelompok_mahasiswa_unique_idx').on(table.classId, table.name)
	]
);

export const kelompokMahasiswaMember = mysqlTable(
	'kelompok_mahasiswa_member',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		kelompokId: varchar('kelompok_id', { length: 36 })
			.notNull()
			.references(() => kelompokMahasiswa.id, { onDelete: 'cascade' }),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('kelompok_member_kelompok_idx').on(table.kelompokId),
		index('kelompok_member_user_idx').on(table.userId),
		uniqueIndex('kelompok_member_unique_idx').on(table.kelompokId, table.userId)
	]
);

export const practicumModuleComponentEnum = mysqlEnum('practicum_module_component', [
	'PREPARASI',
	'RESTORASI'
]);

export const practicumModuleScoringModeEnum = mysqlEnum('practicum_module_scoring_mode', [
	'TOTAL',
	'RUBRIK',
	'CHECKLIST'
]);

export const practicumModule = mysqlTable('practicum_module', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	blockId: varchar('block_id', { length: 36 }).references(() => block.id, { onDelete: 'cascade' }),
	// NULL = general module, no Preparasi/Restorasi split (e.g. "Caries Removal").
	// 'PREPARASI' / 'RESTORASI' = this module represents that half of a schedule's
	// assessment (e.g. "Kelas I — Preparasi", "Kelas I — Restorasi", or a
	// standalone "Inlay — Preparasi" module that has no Restorasi counterpart).
	component: practicumModuleComponentEnum,
	scoringMode: practicumModuleScoringModeEnum.default('TOTAL').notNull(),
	groupLabel: varchar('group_label', { length: 255 }),
	scoreLegend: json('score_legend').$type<{ value: number; label: string }[] | null>(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const practicumAssessmentStatusEnum = mysqlEnum('practicum_assessment_status', [
	'DRAFT',
	'FINAL'
]);

export const practicumAssessment = mysqlTable(
	'practicum_assessment',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		scheduleId: varchar('schedule_id', { length: 36 })
			.notNull()
			.references(() => practicumSchedule.id, { onDelete: 'cascade' }),
		studentId: varchar('student_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		instructorId: varchar('instructor_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		moduleId: varchar('module_id', { length: 36 })
			.notNull()
			.references(() => practicumModule.id, { onDelete: 'cascade' }),

		score: int('score').notNull(),
		notes: text('notes'),

		status: practicumAssessmentStatusEnum.default('FINAL').notNull(),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('practicum_assessment_schedule_idx').on(table.scheduleId),
		index('practicum_assessment_student_idx').on(table.studentId),
		index('practicum_assessment_instructor_idx').on(table.instructorId),
		index('practicum_assessment_module_idx').on(table.moduleId),
		uniqueIndex('practicum_assessment_unique_idx').on(
			table.scheduleId,
			table.studentId,
			table.moduleId
		)
	]
);

export const practicumModuleCriteria = mysqlTable(
	'practicum_module_criteria',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		moduleId: varchar('module_id', { length: 36 }).notNull(),
		name: varchar('name', { length: 255 }).notNull(), // e.g. "Ketepatan preparasi kavitas"
		description: text('description'),
		maxScore: int('max_score').notNull().default(100),
		sortOrder: int('sort_order').default(0).notNull(),
		sectionLabel: varchar('section_label', { length: 255 }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('practicum_module_criteria_module_idx').on(table.moduleId),
		index('practicum_module_criteria_sort_idx').on(table.moduleId, table.sortOrder),
		foreignKey({
			name: 'pm_criteria_module_fk',
			columns: [table.moduleId],
			foreignColumns: [practicumModule.id]
		}).onDelete('cascade')
	]
);

export const practicumAssessmentCriteriaScore = mysqlTable(
	'practicum_assessment_criteria_score',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		assessmentId: varchar('assessment_id', { length: 36 }).notNull(),
		criteriaId: varchar('criteria_id', { length: 36 }).notNull(),
		score: int('score').notNull(),
		notes: text('notes'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('assessment_criteria_score_assessment_idx').on(table.assessmentId),
		index('assessment_criteria_score_criteria_idx').on(table.criteriaId),
		uniqueIndex('assessment_criteria_score_unique_idx').on(table.assessmentId, table.criteriaId),
		foreignKey({
			name: 'pac_score_assessment_fk',
			columns: [table.assessmentId],
			foreignColumns: [practicumAssessment.id]
		}).onDelete('cascade'),
		foreignKey({
			name: 'pac_score_criteria_fk',
			columns: [table.criteriaId],
			foreignColumns: [practicumModuleCriteria.id]
		}).onDelete('cascade')
	]
);

export const department = mysqlTable('department', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const block = mysqlTable('block', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	departmentId: varchar('department_id', { length: 36 })
		.notNull()
		.references(() => department.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const practicumSeries = mysqlTable('practicum_series', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(), // "Clinical Skill Lab"
	description: text('description'),
	blockId: varchar('block_id', { length: 36 }).references(() => block.id, { onDelete: 'cascade' }),
	laboratoriumId: varchar('laboratorium_id', { length: 36 }).references(() => laboratorium.id, {
		onDelete: 'cascade'
	}),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const practicumSchedule = mysqlTable(
	'practicum_schedule',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		seriesId: varchar('series_id', { length: 36 }).references(() => practicumSeries.id, {
			onDelete: 'set null'
		}),
		title: varchar('title', { length: 255 }).notNull(), // Activity Name: "Caries Removal"
		type: practicumTypeEnum.notNull(),
		class: practicumClassEnum.notNull(),

		classId: varchar('class_id', { length: 36 }).references(() => practicumClass.id, {
			onDelete: 'set null'
		}),
		moduleId: varchar('module_id', { length: 36 }).references(() => practicumModule.id, {
			onDelete: 'set null'
		}),

		laboratoriumId: varchar('laboratorium_id', { length: 36 })
			.notNull()
			.references(() => laboratorium.id, { onDelete: 'cascade' }),

		blockId: varchar('block_id', { length: 36 }).references(() => block.id, {
			onDelete: 'set null'
		}),

		// DEPRECATED: input dihapus dari UI Tambah/Edit Jadwal (Modul 7). Kolom
		// dibiarkan ada untuk kompatibilitas data lama, jangan diisi dari form baru.
		semester: int('semester'),

		startTime: timestamp('start_time').notNull(),
		endTime: timestamp('end_time').notNull(),

		participantCount: int('participant_count').notNull().default(0),
		notes: text('notes'),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('practicum_schedule_laboratorium_idx').on(table.laboratoriumId),
		index('practicum_schedule_series_idx').on(table.seriesId),
		index('practicum_schedule_time_idx').on(table.startTime, table.endTime)
	]
);

export const practicumScheduleInstructor = mysqlTable(
	'practicum_schedule_instructor',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		scheduleId: varchar('schedule_id', { length: 36 }).notNull(),
		instructorId: varchar('instructor_id', { length: 36 }).notNull(),
		groupId: varchar('group_id', { length: 36 })
	},
	(table) => [
		index('ps_instructor_schedule_idx').on(table.scheduleId),
		index('ps_instructor_user_idx').on(table.instructorId),
		index('ps_instructor_group_idx').on(table.groupId),
		foreignKey({
			name: 'ps_instr_schedule_fk',
			columns: [table.scheduleId],
			foreignColumns: [practicumSchedule.id]
		}).onDelete('cascade'),
		foreignKey({
			name: 'ps_instr_user_fk',
			columns: [table.instructorId],
			foreignColumns: [user.id]
		}).onDelete('cascade'),
		foreignKey({
			name: 'ps_instr_group_fk',
			columns: [table.groupId],
			foreignColumns: [kelompokMahasiswa.id]
		}).onDelete('set null')
	]
);

export const practicumScheduleModule = mysqlTable(
	'practicum_schedule_module',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		scheduleId: varchar('schedule_id', { length: 36 }).notNull(),
		moduleId: varchar('module_id', { length: 36 }).notNull()
	},
	(table) => [
		index('ps_module_schedule_idx').on(table.scheduleId),
		index('ps_module_module_idx').on(table.moduleId),
		foreignKey({
			name: 'ps_mod_schedule_fk',
			columns: [table.scheduleId],
			foreignColumns: [practicumSchedule.id]
		}).onDelete('cascade'),
		foreignKey({
			name: 'ps_mod_module_fk',
			columns: [table.moduleId],
			foreignColumns: [practicumModule.id]
		}).onDelete('cascade')
	]
);

// ─── Logbook Template ────────────────────────────────────────────────────────
// Stores downloadable/fillable template files associated with a practicum module.
export const practicumLogbookTemplate = mysqlTable(
	'practicum_logbook_template',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		moduleId: varchar('module_id', { length: 36 })
			.notNull()
			.references(() => practicumModule.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 255 }).notNull(), // Display label
		templateFilePath: text('template_file_path').notNull(), // Storage path / URL

		// ── BARU ──────────────────────────────────────────────────────────
		// Kunci builder untuk bagian kompleks (tabel rowspan, dsb) yang tidak
		// bisa direpresentasikan sebagai field datar. null = tidak ada bagian
		// kompleks (template hanya berisi field teks/gambar biasa).
		// Lihat TABLE_BUILDERS di generateLogbook.ts untuk daftar key valid.
		tableBuilderKey: varchar('table_builder_key', { length: 50 }),

		// Catatan internal untuk superadmin di halaman admin, tidak dipakai
		// oleh generator.
		description: text('description'),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [index('logbook_template_module_idx').on(table.moduleId)]
);

// ─── Logbook Template Field (metadata placeholder per template) ──────────────
// Satu baris = satu placeholder yang dipakai template docx tersebut.
// Generator membaca baris-baris ini untuk tahu field apa saja yang perlu
// diisi dan dari mana nilainya berasal, tanpa hardcode per template.
export const practicumLogbookTemplateFieldSourceEnum = mysqlEnum(
	'practicum_logbook_template_field_source',
	['auto', 'manual']
);

export const practicumLogbookTemplateFieldTypeEnum = mysqlEnum(
	'practicum_logbook_template_field_type',
	['text', 'html', 'image']
);

export const practicumLogbookTemplateField = mysqlTable(
	'practicum_logbook_template_field',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		templateId: varchar('template_id', { length: 36 })
			.notNull(),

		// Nama variabel persis seperti di template docx, tanpa kurung kurawal.
		// Untuk valueType 'html', generator otomatis menambahkan prefix '~'
		// saat merender (lihat Langkah 3) — JANGAN simpan '~' di sini.
		placeholderKey: varchar('placeholder_key', { length: 100 }).notNull(),

		// Label tampilan di form pengisian manual (admin/mahasiswa).
		label: varchar('label', { length: 255 }).notNull(),

		// 'text'  → placeholder {key} biasa
		// 'html'  → placeholder {~key}, nilai diparsing sebagai HTML
		// 'image' → sama seperti 'html', tapi generator tahu harus membungkus
		//           nilai (base64 data URL) dengan <img> sebelum dirender;
		//           autoSourcePath untuk tipe ini menunjuk ke kolom path/URL
		//           gambar, bukan data URL siap pakai.
		valueType: practicumLogbookTemplateFieldTypeEnum.notNull().default('text'),

		// 'auto'   → nilai diresolusi otomatis dari autoSourcePath, mahasiswa
		//            tidak diminta mengisi apa pun.
		// 'manual' → mahasiswa harus mengisi lewat form sebelum generate.
		source: practicumLogbookTemplateFieldSourceEnum.notNull().default('auto'),

		// Dot-path untuk resolusi otomatis terhadap context object yang
		// dibangun generator, misal: 'student.name', 'student.image',
		// 'series.name', 'series.laboratorium.name', 'schedule.semester'.
		// Wajib diisi jika source = 'auto'. Diabaikan jika source = 'manual'.
		autoSourcePath: varchar('auto_source_path', { length: 255 }),

		// Wajib diisi oleh mahasiswa jika source = 'manual'. Diabaikan untuk
		// 'auto'.
		required: boolean('required').default(false).notNull(),

		// Nilai fallback: dipakai jika source='auto' gagal resolve (path
		// tidak ada/null), atau jika source='manual' dan required=false lalu
		// dikosongkan.
		defaultValue: text('default_value'),

		// Urutan tampil di form pengisian manual.
		sortOrder: int('sort_order').default(0).notNull(),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('logbook_template_field_template_idx').on(table.templateId),
		uniqueIndex('logbook_template_field_unique_idx').on(
			table.templateId,
			table.placeholderKey
		),
		foreignKey({
			name: 'practicum_logbook_template_field_template_id_fk',
			columns: [table.templateId],
			foreignColumns: [practicumLogbookTemplate.id]
		}).onDelete('cascade')
	]
);

// ─── Logbook (per user) ───────────────────────────────────────────────────────
// One logbook per user (peneliti/mahasiswa). Represents their entire logbook record.
export const practicumLogbook = mysqlTable(
	'practicum_logbook',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow(),
		lastGeneratedAt: timestamp('last_generated_at')
	},
	(table) => [index('logbook_user_idx').on(table.userId)]
);

// ─── Logbook Entry ────────────────────────────────────────────────────────────
// One entry per practicum schedule session. Stores the uploaded filled file.
export const practicumLogbookEntry = mysqlTable(
	'practicum_logbook_entry',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		logbookId: varchar('logbook_id', { length: 36 })
			.notNull()
			.references(() => practicumLogbook.id, { onDelete: 'cascade' }),
		seriesId: varchar('series_id', { length: 36 }).references(() => practicumSeries.id, {
			onDelete: 'set null'
		}),
		scheduleId: varchar('schedule_id', { length: 36 }).references(() => practicumSchedule.id, {
			onDelete: 'set null'
		}),
		// The student's uploaded file (filled logbook document)
		fileUrl: text('file_url').notNull(),
		fileName: varchar('file_name', { length: 255 }),
		notes: text('notes'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('logbook_entry_logbook_idx').on(table.logbookId),
		index('logbook_entry_series_idx').on(table.seriesId),
		index('logbook_entry_schedule_idx').on(table.scheduleId),
		uniqueIndex('logbook_entry_unique_idx').on(table.logbookId, table.scheduleId)
	]
);

export const warehouseRelations = relations(warehouse, ({ many, one }) => ({
	equipments: many(equipment)
}));

export const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, {
		fields: [notification.userId],
		references: [user.id]
	}),
	laboratorium: one(laboratorium, {
		fields: [notification.laboratoriumId],
		references: [laboratorium.id]
	})
}));

export const equipmentRelations = relations(equipment, ({ many, one }) => ({
	item: one(item, {
		fields: [equipment.itemId],
		references: [item.id]
	}),
	warehouse: one(warehouse, { fields: [equipment.warehouseId], references: [warehouse.id] }),
	laboratorium: one(laboratorium, {
		fields: [equipment.laboratoriumId],
		references: [laboratorium.id]
	}),
	maintenances: many(maintenance),
	lendingItems: many(lendingItem),
	movements: many(movement)
}));

export const maintenanceRelations = relations(maintenance, ({ one, many }) => ({
	equipment: one(equipment, {
		fields: [maintenance.equipmentId],
		references: [equipment.id]
	}),
	costs: many(maintenanceCost)
}));

export const maintenanceCostRelations = relations(maintenanceCost, ({ one, many }) => ({
	maintenance: one(maintenance, {
		fields: [maintenanceCost.maintenanceId],
		references: [maintenance.id]
	}),
	items: many(maintenanceCostItem)
}));

export const maintenanceCostItemRelations = relations(maintenanceCostItem, ({ one }) => ({
	cost: one(maintenanceCost, {
		fields: [maintenanceCostItem.costId],
		references: [maintenanceCost.id]
	})
}));

export const approvalRelations = relations(approval, ({ one }) => ({
	approvedByUser: one(user, {
		fields: [approval.approvedBy],
		references: [user.id]
	}),
	lending: one(lending, {
		fields: [approval.referenceId],
		references: [lending.id]
	}),
	maintenance: one(maintenance, {
		fields: [approval.referenceId],
		references: [maintenance.id]
	})
}));

export const lendingRelations = relations(lending, ({ many, one }) => ({
	laboratorium: one(laboratorium, {
		fields: [lending.laboratoriumId],
		references: [laboratorium.id]
	}),
	requestedByUser: one(user, {
		fields: [lending.requestedBy],
		references: [user.id]
	}),
	approvedByUser: one(user, {
		fields: [lending.approvedBy],
		references: [user.id]
	}),
	approvals: many(approval),
	items: many(lendingItem)
}));

export const lendingItemRelations = relations(lendingItem, ({ one }) => ({
	lending: one(lending, {
		fields: [lendingItem.lendingId],
		references: [lending.id]
	}),
	equipment: one(equipment, {
		fields: [lendingItem.equipmentId],
		references: [equipment.id]
	})
}));

export const itemRelations = relations(item, ({ many, one }) => ({
	stocks: many(stock),
	movements: many(movement),
	unitConversions: many(itemUnitConversion),
	equipments: many(equipment),
	category: one(equipmentCategory, {
		fields: [item.categoryId],
		references: [equipmentCategory.id]
	})
}));

export const itemUnitConversionRelations = relations(itemUnitConversion, ({ one }) => ({
	item: one(item, {
		fields: [itemUnitConversion.itemId],
		references: [item.id]
	})
}));

export const stockRelations = relations(stock, ({ one, many }) => ({
	item: one(item, {
		fields: [stock.itemId],
		references: [item.id]
	}),
	warehouse: one(warehouse, {
		fields: [stock.warehouseId],
		references: [warehouse.id]
	}),
	laboratorium: one(laboratorium, {
		fields: [stock.laboratoriumId],
		references: [laboratorium.id]
	}),
	batches: many(stockBatch)
}));

export const safetyIncidentRelations = relations(safetyIncident, ({ one }) => ({
	laboratorium: one(laboratorium, {
		fields: [safetyIncident.laboratoriumId],
		references: [laboratorium.id]
	})
}));

export const wasteLogRelations = relations(wasteLog, ({ one }) => ({
	laboratorium: one(laboratorium, {
		fields: [wasteLog.laboratoriumId],
		references: [laboratorium.id]
	}),
	pic: one(user, {
		fields: [wasteLog.picId],
		references: [user.id]
	})
}));

export const movementRelations = relations(movement, ({ one }) => ({
	item: one(item, {
		fields: [movement.itemId],
		references: [item.id]
	}),
	equipment: one(equipment, {
		fields: [movement.equipmentId],
		references: [equipment.id]
	}),
	fromWarehouse: one(warehouse, {
		fields: [movement.fromWarehouseId],
		references: [warehouse.id],
		relationName: 'movement_from_warehouse'
	}),
	toWarehouse: one(warehouse, {
		fields: [movement.toWarehouseId],
		references: [warehouse.id],
		relationName: 'movement_to_warehouse'
	}),
	laboratorium: one(laboratorium, {
		fields: [movement.laboratoriumId],
		references: [laboratorium.id]
	}),
	pic: one(user, {
		fields: [movement.picId],
		references: [user.id]
	})
}));

export const departmentRelations = relations(department, ({ many }) => ({
	blocks: many(block)
}));

export const blockRelations = relations(block, ({ one, many }) => ({
	department: one(department, {
		fields: [block.departmentId],
		references: [department.id]
	}),
	practicumSchedules: many(practicumSchedule),
	practicumSeries: many(practicumSeries)
}));

export const practicumSeriesRelations = relations(practicumSeries, ({ one, many }) => ({
	laboratorium: one(laboratorium, {
		fields: [practicumSeries.laboratoriumId],
		references: [laboratorium.id]
	}),
	block: one(block, {
		fields: [practicumSeries.blockId],
		references: [block.id]
	}),
	schedules: many(practicumSchedule)
}));

export const practicumScheduleRelations = relations(practicumSchedule, ({ one, many }) => ({
	series: one(practicumSeries, {
		fields: [practicumSchedule.seriesId],
		references: [practicumSeries.id]
	}),
	laboratorium: one(laboratorium, {
		fields: [practicumSchedule.laboratoriumId],
		references: [laboratorium.id]
	}),
	block: one(block, {
		fields: [practicumSchedule.blockId],
		references: [block.id]
	}),
	practicumClass: one(practicumClass, {
		fields: [practicumSchedule.classId],
		references: [practicumClass.id]
	}),
	instructors: many(practicumScheduleInstructor),
	modules: many(practicumScheduleModule)
}));

export const practicumScheduleInstructorRelations = relations(
	practicumScheduleInstructor,
	({ one }) => ({
		schedule: one(practicumSchedule, {
			fields: [practicumScheduleInstructor.scheduleId],
			references: [practicumSchedule.id]
		}),
		user: one(user, {
			fields: [practicumScheduleInstructor.instructorId],
			references: [user.id]
		}),
		group: one(kelompokMahasiswa, {
			fields: [practicumScheduleInstructor.groupId],
			references: [kelompokMahasiswa.id]
		})
	})
);

export const practicumScheduleModuleRelations = relations(practicumScheduleModule, ({ one }) => ({
	schedule: one(practicumSchedule, {
		fields: [practicumScheduleModule.scheduleId],
		references: [practicumSchedule.id]
	}),
	module: one(practicumModule, {
		fields: [practicumScheduleModule.moduleId],
		references: [practicumModule.id]
	})
}));

export const practicumClassRelations = relations(practicumClass, ({ many }) => ({
	members: many(practicumClassMember),
	groups: many(kelompokMahasiswa)
}));

export const practicumClassMemberRelations = relations(practicumClassMember, ({ one }) => ({
	class: one(practicumClass, {
		fields: [practicumClassMember.classId],
		references: [practicumClass.id]
	}),
	user: one(user, {
		fields: [practicumClassMember.userId],
		references: [user.id]
	})
}));

export const kelompokMahasiswaRelations = relations(kelompokMahasiswa, ({ one, many }) => ({
	class: one(practicumClass, {
		fields: [kelompokMahasiswa.classId],
		references: [practicumClass.id]
	}),
	members: many(kelompokMahasiswaMember),
	scheduleInstructors: many(practicumScheduleInstructor)
}));

export const kelompokMahasiswaMemberRelations = relations(kelompokMahasiswaMember, ({ one }) => ({
	kelompok: one(kelompokMahasiswa, {
		fields: [kelompokMahasiswaMember.kelompokId],
		references: [kelompokMahasiswa.id]
	}),
	user: one(user, {
		fields: [kelompokMahasiswaMember.userId],
		references: [user.id]
	})
}));

export const practicumAssessmentRelations = relations(practicumAssessment, ({ one, many }) => ({
	schedule: one(practicumSchedule, {
		fields: [practicumAssessment.scheduleId],
		references: [practicumSchedule.id]
	}),
	student: one(user, {
		fields: [practicumAssessment.studentId],
		references: [user.id],
		relationName: 'student_assessments'
	}),
	instructor: one(user, {
		fields: [practicumAssessment.instructorId],
		references: [user.id],
		relationName: 'instructor_assessments'
	}),
	module: one(practicumModule, {
		fields: [practicumAssessment.moduleId],
		references: [practicumModule.id]
	}),
	criteriaScores: many(practicumAssessmentCriteriaScore)
}));

export const practicumLogbookTemplateRelations = relations(
	practicumLogbookTemplate,
	({ one, many }) => ({
		module: one(practicumModule, {
			fields: [practicumLogbookTemplate.moduleId],
			references: [practicumModule.id]
		}),
		fields: many(practicumLogbookTemplateField) // BARU
	})
);

// BARU
export const practicumLogbookTemplateFieldRelations = relations(
	practicumLogbookTemplateField,
	({ one }) => ({
		template: one(practicumLogbookTemplate, {
			fields: [practicumLogbookTemplateField.templateId],
			references: [practicumLogbookTemplate.id]
		})
	})
);

export const practicumLogbookRelations = relations(practicumLogbook, ({ one, many }) => ({
	user: one(user, {
		fields: [practicumLogbook.userId],
		references: [user.id]
	}),
	entries: many(practicumLogbookEntry)
}));

export const practicumLogbookEntryRelations = relations(practicumLogbookEntry, ({ one }) => ({
	logbook: one(practicumLogbook, {
		fields: [practicumLogbookEntry.logbookId],
		references: [practicumLogbook.id]
	}),
	schedule: one(practicumSchedule, {
		fields: [practicumLogbookEntry.scheduleId],
		references: [practicumSchedule.id]
	})
}));

export const practicumModuleRelations = relations(practicumModule, ({ one, many }) => ({
	block: one(block, {
		fields: [practicumModule.blockId],
		references: [block.id]
	}),
	templates: many(practicumLogbookTemplate),
	assessments: many(practicumAssessment),
	schedules: many(practicumScheduleModule),
	criteria: many(practicumModuleCriteria)
}));

export const practicumModuleCriteriaRelations = relations(
	practicumModuleCriteria,
	({ one, many }) => ({
		module: one(practicumModule, {
			fields: [practicumModuleCriteria.moduleId],
			references: [practicumModule.id]
		}),
		scores: many(practicumAssessmentCriteriaScore)
	})
);

export const practicumAssessmentCriteriaScoreRelations = relations(
	practicumAssessmentCriteriaScore,
	({ one }) => ({
		assessment: one(practicumAssessment, {
			fields: [practicumAssessmentCriteriaScore.assessmentId],
			references: [practicumAssessment.id]
		}),
		criteria: one(practicumModuleCriteria, {
			fields: [practicumAssessmentCriteriaScore.criteriaId],
			references: [practicumModuleCriteria.id]
		})
	})
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	members: many(laboratoriumMember),
	apiKeys: many(apiKey),
	practicumSchedules: many(practicumScheduleInstructor),
	practicumClasses: many(practicumClassMember),
	studentAssessments: many(practicumAssessment, {
		relationName: 'student_assessments'
	}),
	instructorAssessments: many(practicumAssessment, {
		relationName: 'instructor_assessments'
	}),
	logbooks: many(practicumLogbook)
}));

export const laboratoriumRelations = relations(laboratorium, ({ many }) => ({
	members: many(laboratoriumMember),
	practicumSchedules: many(practicumSchedule),
	equipments: many(equipment),
	movements: many(movement),
	safetyIncidents: many(safetyIncident)
}));

export const practicumLogbookGeneration = mysqlTable(
	'practicum_logbook_generation',
	{
		id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		seriesId: varchar('series_id', { length: 36 })
			.notNull()
			.references(() => practicumSeries.id, { onDelete: 'cascade' }),
		generatedFileName: varchar('generated_file_name', { length: 255 }),
		pdfUrl: varchar('pdf_url', { length: 255 }),
		generatedAt: timestamp('generated_at').defaultNow().notNull()
	},
	(table) => [
		index('logbook_gen_user_idx').on(table.userId),
		index('logbook_gen_series_idx').on(table.seriesId),
		uniqueIndex('logbook_gen_unique_idx').on(table.userId, table.seriesId)
	]
);

export const practicumLogbookGenerationRelations = relations(
	practicumLogbookGeneration,
	({ one }) => ({
		user: one(user, {
			fields: [practicumLogbookGeneration.userId],
			references: [user.id]
		}),
		series: one(practicumSeries, {
			fields: [practicumLogbookGeneration.seriesId],
			references: [practicumSeries.id]
		})
	})
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
	user: one(user, {
		fields: [auditLog.userId],
		references: [user.id]
	})
}));



export const inventoryReportRelations = relations(inventoryReport, ({ one }) => ({
	laboratorium: one(laboratorium, {
		fields: [inventoryReport.laboratoriumId],
		references: [laboratorium.id]
	}),
	item: one(item, {
		fields: [inventoryReport.itemId],
		references: [item.id]
	})
}));

export * from './auth.schema';
