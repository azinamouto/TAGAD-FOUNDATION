import prisma, { isDatabaseConnected } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { FALLBACK_BARANGAYS } from '../lib/fallbackStore';

export class BarangayService {
  public static async getGeoData() {
    const barangays = await this.getBarangays();
    return {
      type: 'FeatureCollection',
      features: barangays.map((barangay: any) => {
        const located = typeof barangay.latitude === 'number' && typeof barangay.longitude === 'number';
        const boundary = barangay.boundary || null;
        const geometry = boundary || (located ? { type: 'Point', coordinates: [barangay.longitude, barangay.latitude] } : null);
        return {
          type: 'Feature', id: barangay.id, geometry,
          properties: {
            barangayName: barangay.name, code: barangay.code,
            latitude: located ? barangay.latitude : null,
            longitude: located ? barangay.longitude : null,
            geoSource: barangay.geoSource || null,
            geoStatus: !geometry ? 'NO DATA' : barangay.geoVerified ? 'VERIFIED' : 'UNVERIFIED',
          },
        };
      }),
    };
  }

  public static async getBarangays() {
    if (!isDatabaseConnected()) {
      return FALLBACK_BARANGAYS;
    }

    try {
      return await prisma.barangay.findMany({
        orderBy: { name: 'asc' },
      });
    } catch {
      return FALLBACK_BARANGAYS;
    }
  }

  public static async getBarangayById(id: string) {
    if (!isDatabaseConnected()) {
      const brgy = FALLBACK_BARANGAYS.find((b) => b.id === id || b.code === id || b.name.toLowerCase() === id.toLowerCase());
      if (brgy) {
        return {
          ...brgy,
          _count: { households: 120, beneficiaries: 85 },
        };
      }
      throw new NotFoundError('Barangay');
    }

    try {
      const barangay = await prisma.barangay.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              households: true,
              beneficiaries: true,
            },
          },
        },
      });

      if (!barangay) {
        throw new NotFoundError('Barangay');
      }

      return barangay;
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      const brgy = FALLBACK_BARANGAYS.find((b) => b.id === id || b.code === id || b.name.toLowerCase() === id.toLowerCase());
      if (brgy) {
        return {
          ...brgy,
          _count: { households: 120, beneficiaries: 85 },
        };
      }
      throw new NotFoundError('Barangay');
    }
  }
}

