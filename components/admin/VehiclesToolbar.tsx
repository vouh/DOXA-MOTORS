'use client'

import KpiViewToggle from '@/components/admin/KpiViewToggle'
import NewVehicleButton from '@/components/admin/NewVehicleButton'
import type { CategoryStartingPrices } from '@/lib/loyalty/defaults'

/** Cards/Charts (blue) + Add Vehicle — same row as Fleet Management title. */
export default function VehiclesToolbar({
  owners,
  startingPrices,
}: {
  owners: Array<{ id: string; fullName: string }>
  startingPrices?: CategoryStartingPrices
}) {
  return (
    <div className="flex flex-row flex-wrap items-center justify-end gap-2">
      <KpiViewToggle />
      <NewVehicleButton owners={owners} startingPrices={startingPrices} />
    </div>
  )
}
