export type RekapModule = {
	id: string;
	name: string;
	component: 'PREPARASI' | 'RESTORASI' | null;
};

export type RekapScheduleInput = {
	id: string;
	title: string;
	modules: RekapModule[]; // already unwrapped from practicumScheduleModule.module
};

export type RekapColumn = {
	scheduleId: string;
	title: string;
	moduleId: string;
	component: 'PREPARASI' | 'RESTORASI' | null;
	/** Header label for the sub-row. Empty string means "no sub-row, this column
	 * spans both header rows on its own" (rowspan=2 case, e.g. "Caries Removal"). */
	subLabel: string;
};

export type RekapScheduleGroup = {
	scheduleId: string;
	title: string;
	columns: RekapColumn[];
	/** true when this schedule contributes exactly one column with no PREP/RESTO
	 * split — render it with rowspan=2 and no second header row cell. */
	singleColumn: boolean;
};

/**
 * Orders a schedule's modules Preparasi -> Restorasi -> (unlabeled, by name), and
 * decides the sub-header label per the screenshot's two label styles:
 *  - 2 components in the same schedule -> abbreviated ("PREP" / "RESTO")
 *  - exactly 1 component -> full word ("Preparasi" / "Restorasi")
 *  - modules with component = null -> fall back to the module's own name (legacy
 *    behavior, keeps old multi-module schedules working), or no sub-row at all when
 *    there's only one such module.
 */
export function buildRekapColumns(schedules: RekapScheduleInput[]): RekapScheduleGroup[] {
	const order = { PREPARASI: 0, RESTORASI: 1 } as const;

	return schedules.map((schedule) => {
		const sorted = [...schedule.modules].sort((a, b) => {
			const av = a.component ? order[a.component] : 2;
			const bv = b.component ? order[b.component] : 2;
			if (av !== bv) return av - bv;
			return a.name.localeCompare(b.name);
		});

		const componentCount = sorted.filter((m) => m.component !== null).length;

		const columns: RekapColumn[] = sorted.map((mod) => {
			let subLabel = '';
			if (mod.component) {
				const full = mod.component === 'PREPARASI' ? 'Preparasi' : 'Restorasi';
				const abbr = mod.component === 'PREPARASI' ? 'PREP' : 'RESTO';
				subLabel = componentCount > 1 ? abbr : full;
			} else if (sorted.length > 1) {
				subLabel = mod.name; // legacy multi-module-without-component fallback
			}
			return {
				scheduleId: schedule.id,
				title: schedule.title,
				moduleId: mod.id,
				component: mod.component,
				subLabel
			};
		});

		return {
			scheduleId: schedule.id,
			title: schedule.title,
			columns,
			singleColumn: columns.length === 1 && columns[0].component === null
		};
	});
}
