import { normalizeCv } from "@/lib/cvHelpers";

// Renders a CV in one of three templates. This is what gets turned into a
// PDF, so it stays clean and print-friendly.

function SectionTitle({ template, children }) {
  if (template === "simple") {
    return (
      <h2 className="mt-5 mb-2 border-b border-black text-sm font-bold uppercase tracking-wide text-black">
        {children}
      </h2>
    );
  }
  if (template === "graduate") {
    return (
      <h2 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
        {children}
      </h2>
    );
  }
  return (
    <h2 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-blue-700">
      {children}
    </h2>
  );
}

function Bullets({ items }) {
  const list = (items || []).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed text-slate-700">
      {list.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function Experience({ cv, template }) {
  if (!cv.experience.length) return null;
  return (
    <section>
      <SectionTitle template={template}>Work Experience</SectionTitle>
      <div className="space-y-4">
        {cv.experience.map((job, index) => (
          <div key={index}>
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <p className="font-semibold text-slate-900">
                {job.title || "Role"}
              </p>
              <p className="text-xs text-slate-500">
                {[job.startDate, job.endDate].filter(Boolean).join(" – ")}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {[job.company, job.location].filter(Boolean).join(", ")}
            </p>
            <Bullets items={job.bullets} />
          </div>
        ))}
      </div>
    </section>
  );
}

function Education({ cv, template }) {
  if (!cv.education.length) return null;
  return (
    <section>
      <SectionTitle template={template}>Education</SectionTitle>
      <div className="space-y-3">
        {cv.education.map((item, index) => (
          <div key={index}>
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <p className="font-semibold text-slate-900">
                {item.qualification || "Qualification"}
              </p>
              <p className="text-xs text-slate-500">
                {[item.startDate, item.endDate].filter(Boolean).join(" – ")}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {[item.institution, item.location].filter(Boolean).join(", ")}
            </p>
            {item.details ? (
              <p className="text-sm text-slate-700">{item.details}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ListSection({ title, template, items }) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <section>
      <SectionTitle template={template}>{title}</SectionTitle>
      <ul className="list-disc pl-5 text-sm text-slate-700">
        {list.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Skills({ cv, template }) {
  const skills = cv.skills.map((s) => String(s).trim()).filter(Boolean);
  if (!skills.length) return null;

  if (template === "simple") {
    return (
      <section>
        <SectionTitle template={template}>Skills</SectionTitle>
        <p className="text-sm text-slate-700">{skills.join(", ")}</p>
      </section>
    );
  }

  const chip =
    template === "graduate"
      ? "bg-emerald-50 text-emerald-800"
      : "bg-blue-50 text-blue-800";

  return (
    <section>
      <SectionTitle template={template}>Skills</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill, index) => (
          <span
            key={index}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}
          >
            {skill}
          </span>
        ))}
      </div>
    </section>
  );
}

function Projects({ cv, template }) {
  if (!cv.projects.length) return null;
  return (
    <section>
      <SectionTitle template={template}>Projects</SectionTitle>
      <div className="space-y-2">
        {cv.projects.map((project, index) => (
          <div key={index}>
            <p className="text-sm font-semibold text-slate-900">
              {project.name}
            </p>
            {project.description ? (
              <p className="text-sm text-slate-700">{project.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function References({ cv, template }) {
  if (!cv.references.length) return null;
  return (
    <section>
      <SectionTitle template={template}>References</SectionTitle>
      <ul className="space-y-1 text-sm text-slate-700">
        {cv.references.map((reference, index) => (
          <li key={index}>
            <span className="font-medium text-slate-900">
              {reference.name}
            </span>
            {reference.contact ? ` — ${reference.contact}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CVPreview({ cv: rawCv, template = "modern" }) {
  const cv = normalizeCv(rawCv);

  const contact = [cv.email, cv.phone, cv.location].filter(Boolean);
  const headerColor =
    template === "simple"
      ? "text-black"
      : template === "graduate"
      ? "text-emerald-700"
      : "text-blue-700";

  return (
    <div
      id="cv-preview"
      className="mx-auto w-full max-w-[794px] bg-white p-8 text-slate-800 shadow-sm"
    >
      <header
        className={
          template === "simple"
            ? "border-b-2 border-black pb-3"
            : "border-b pb-3"
        }
      >
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {cv.fullName || "Client Name"}
        </h1>
        {cv.targetJobTitle ? (
          <p className={`text-sm font-medium ${headerColor}`}>
            {cv.targetJobTitle}
          </p>
        ) : null}
        {contact.length ? (
          <p className="mt-1 text-xs text-slate-500">
            {contact.join("  •  ")}
          </p>
        ) : null}
      </header>

      {(cv.summary || cv.warnings.length > 0) && (
        <section>
          {cv.summary ? (
            <>
              <SectionTitle template={template}>
                Professional Summary
              </SectionTitle>
              <p className="text-sm leading-relaxed text-slate-700">
                {cv.summary}
              </p>
            </>
          ) : null}
          {cv.warnings.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">
                Review needed (flagged by the assistant):
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
                {cv.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      {template === "graduate" ? (
        <>
          <Education cv={cv} template={template} />
          <Skills cv={cv} template={template} />
          <Projects cv={cv} template={template} />
          <Experience cv={cv} template={template} />
        </>
      ) : (
        <>
          <Skills cv={cv} template={template} />
          <Experience cv={cv} template={template} />
          <Education cv={cv} template={template} />
          <Projects cv={cv} template={template} />
        </>
      )}

      <ListSection
        title="Qualifications"
        template={template}
        items={cv.qualifications}
      />
      <ListSection
        title="Certificates"
        template={template}
        items={cv.certificates}
      />
      <References cv={cv} template={template} />
    </div>
  );
}
