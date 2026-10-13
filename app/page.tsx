import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#111111]">
      <Navbar />

      <section className="px-6 pb-24 pt-20 md:px-10 md:pb-32 md:pt-32">
        <div className="max-w-5xl">
          <p className="mb-6 text-sm uppercase tracking-[0.25em]">
            Technology • Print • Business Services
          </p>

          <h1 className="text-6xl font-medium leading-[0.95] tracking-[-0.05em] md:text-8xl">
            Technology &
            <br />
            Services,
            <br />
            Made Simple.
          </h1>

          <div className="mt-10 max-w-xl">
            <p className="text-lg leading-8 text-gray-600">
              Professional printing, digital services, business solutions
              and everyday technology all in one place.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#services"
              className="rounded-full bg-black px-7 py-4 text-sm text-white transition hover:bg-gray-800"
            >
              Explore Services
            </a>

            <a
              href="#contact"
              className="rounded-full border border-black px-7 py-4 text-sm transition hover:bg-black hover:text-white"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
