import Image from "next/image";
export default function ImageShowcase() {
  const imgs = ["/images/celebrate-1.jpg", "/images/celebrate-2.jpg"];
  return (
    <section className="container py-16">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative col-span-2 h-72 md:h-96 rounded-2xl overflow-hidden">
          <Image src={imgs[0]} alt="Tablescape" fill className="object-cover" />
        </div>
        <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden">
          <Image src={imgs[1]} alt="Dancing and celebration" fill className="object-cover" />
        </div>
      </div>
    </section>
  );
}
