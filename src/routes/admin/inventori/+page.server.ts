import { db } from '$lib/server/db';
import { item, equipment, stock, maintenance } from '$lib/server/db/schema';
import { sql, eq, and, gt, lt } from 'drizzle-orm';

export const load = async () => {
	// 1. Ambil semua item beserta relasinya
	const items = await db.query.item.findMany({
		with: {
			stocks: {
				with: {
					warehouse: true
				}
			}
		}
	});

	// 2. Ambil data fisik (equipment) untuk aset
	const equipments = await db.query.equipment.findMany({
		with: {
			item: true,
			warehouse: true,
			maintenances: {
				orderBy: (m, { desc }) => [desc(m.createdAt)],
				limit: 1
			}
		}
	});

	// 3. Hitung Summary (Data Riil)
	const totalAlat = await db.select({ count: sql<number>`count(*)` }).from(equipment);
	const totalBahan = await db.select({ count: sql<number>`count(*)` }).from(item).where(eq(item.type, 'CONSUMABLE'));
	
	// Mendekati kadaluarsa (Contoh: stok < minStock untuk bahan)
	const lowStock = await db.select({ count: sql<number>`count(*)` })
		.from(item)
		.where(and(eq(item.type, 'CONSUMABLE'), sql`${item.minStock} >= (select sum(qty) from stock where item_id = ${item.id})`));

	// Perlu Kalibrasi (Contoh: status MAINTENANCE atau belum pernah kalibrasi > 1 tahun)
	const needMaintenance = await db.select({ count: sql<number>`count(*)` })
		.from(maintenance)
		.where(eq(maintenance.status, 'PENDING'));

	// 4. Mapping data untuk tabel
    const alatData = equipments.map(eqp => ({
        id: eqp.id,
        name: eqp.item.name,
        serialNumber: eqp.serialNumber || '-',
        category: eqp.item.equipmentType || 'ASSET',
        location: eqp.warehouse?.name || '-',
        stock: 1, // Physical unit is always 1
        status: eqp.status || 'READY',
        lastCalibration: eqp.maintenances[0]?.completionDate?.toLocaleDateString('id-ID') || '-',
        nextCalibration: eqp.maintenances[0]?.scheduledDate?.toLocaleDateString('id-ID') || '-',
        type: 'ALAT' as const
    }));

    const bahanData = items.filter(i => i.type === 'CONSUMABLE').map(i => {
        const totalQty = i.stocks.reduce((acc, s) => acc + (s.qty || 0), 0);
        return {
            id: i.id,
            name: i.name,
            category: 'Bahan Habis Pakai',
            location: i.stocks[0]?.warehouse?.name || 'Gudang Utama',
            stock: totalQty,
            status: totalQty === 0 ? 'Habis' : (totalQty <= (i.minStock || 0) ? 'Hampir Habis' : 'Tersedia'),
            lastCalibration: '-',
            nextCalibration: '-',
            type: 'BAHAN' as const
        };
    });

	return {
		summary: {
			totalAlat: totalAlat[0].count,
			totalBahan: totalBahan[0].count,
			mendekatiKadaluarsa: lowStock[0].count,
			perluKalibrasi: needMaintenance[0].count
		},
		inventory: [...alatData, ...bahanData]
	};
};
