"use client";
import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <form className="mt-8 grid gap-4" onSubmit={(e) => { e.preventDefault(); setStatus("Submitted! (This demo saves nowhere yet.)"); }}>
      <label className="grid gap-1"><span>Name</span><input required /></label>
      <label className="grid gap-1"><span>Email</span><input type="email" required /></label>
      <label className="grid gap-1"><span>Simchah Type</span><select><option>Wedding</option><option>Bar/Bat Mitzvah</option><option>Bris</option><option>Other</option></select></label>
      <label className="grid gap-1"><span>Estimated Guest Count</span><input type="number" /></label>
      <button className="btn-primary w-fit">Submit</button>
      {status && <p className="text-green-700">{status}</p>}
    </form>
  );
}
