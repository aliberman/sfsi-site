type Props = { title: string; capacity?: string; neighborhood?: string; shabbosFriendly?: boolean; children?: React.ReactNode; };
export default function VenueCard({ title, capacity, neighborhood, shabbosFriendly, children }: Props) {
  return (
    <div className="card">
      <h3 className="font-medium">{title}</h3>
      <div className="mt-2 text-sm text-gray-600 space-y-1">
        {capacity && <div>Capacity: {capacity}</div>}
        {neighborhood && <div>Neighborhood: {neighborhood}</div>}
        {shabbosFriendly !== undefined && (<div>Shabbos-friendly: {shabbosFriendly ? "Yes" : "No"}</div>)}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
