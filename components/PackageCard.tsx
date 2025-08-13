type Props = { name: string; price: string; items: string[] };
export default function PackageCard({ name, price, items }: Props) {
  return (
    <div className="card">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium">{name}</h3>
        <div className="text-sm text-gray-500">{price}</div>
      </div>
      <ul className="mt-4 list-disc pl-5 text-sm text-gray-700">
        {items.map(i => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}
