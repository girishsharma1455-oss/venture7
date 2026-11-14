/** Pulse only the three background layers; the logo, nodes and layout stay still. */
export default function WhyVentureRings() {
  return (
    <div aria-hidden="true" data-recording-animation="why-venture7" className="pointer-events-none absolute inset-0 -z-10">
      <span className="absolute left-1/2 top-1/2 size-[495.56px] -translate-x-1/2 -translate-y-1/2 animate-venture-ring-one rounded-full bg-[#035c56] opacity-[0.14] motion-reduce:animate-none" />
      <span className="absolute left-1/2 top-1/2 size-[495.56px] -translate-x-1/2 -translate-y-1/2 animate-venture-ring-two rounded-full bg-[rgba(3,92,86,0.75)] opacity-[0.1] motion-reduce:animate-none" />
      <span className="absolute left-1/2 top-1/2 size-[495.56px] -translate-x-1/2 -translate-y-1/2 animate-venture-ring-three rounded-full bg-[rgba(3,92,86,0.5)] opacity-[0.05] motion-reduce:animate-none" />
    </div>
  );
}
