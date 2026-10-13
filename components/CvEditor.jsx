"use client";

// An editable form for the structured CV.
// It receives the current CV object and calls onChange with a new one.

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

// Convert an array of strings <-> a textarea where each line is one item.
function linesToArray(text) {
  return text.split("\n"); // keep blank lines while typing; filtered when shown
}
function arrayToLines(array) {
  return (array || []).join("\n");
}

export default function CvEditor({ cv, onChange }) {
  function setField(field) {
    return (event) => onChange({ ...cv, [field]: event.target.value });
  }

  function setArrayField(field) {
    return (event) =>
      onChange({ ...cv, [field]: linesToArray(event.target.value) });
  }

  // ---- experience ----
  function updateExperience(index, key, value) {
    const next = cv.experience.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    onChange({ ...cv, experience: next });
  }
  function addExperience() {
    onChange({
      ...cv,
      experience: [
        ...cv.experience,
        {
          title: "",
          company: "",
          location: "",
          startDate: "",
          endDate: "",
          bullets: [],
        },
      ],
    });
  }
  function removeExperience(index) {
    onChange({
      ...cv,
      experience: cv.experience.filter((_, i) => i !== index),
    });
  }

  // ---- education ----
  function updateEducation(index, key, value) {
    const next = cv.education.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    onChange({ ...cv, education: next });
  }
  function addEducation() {
    onChange({
      ...cv,
      education: [
        ...cv.education,
        {
          qualification: "",
          institution: "",
          location: "",
          startDate: "",
          endDate: "",
          details: "",
        },
      ],
    });
  }
  function removeEducation(index) {
    onChange({
      ...cv,
      education: cv.education.filter((_, i) => i !== index),
    });
  }

  // ---- projects ----
  function updateProject(index, key, value) {
    const next = cv.projects.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    onChange({ ...cv, projects: next });
  }
  function addProject() {
    onChange({ ...cv, projects: [...cv.projects, { name: "", description: "" }] });
  }
  function removeProject(index) {
    onChange({ ...cv, projects: cv.projects.filter((_, i) => i !== index) });
  }

  // ---- references ----
  function updateReference(index, key, value) {
    const next = cv.references.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    onChange({ ...cv, references: next });
  }
  function addReference() {
    onChange({ ...cv, references: [...cv.references, { name: "", contact: "" }] });
  }
  function removeReference(index) {
    onChange({ ...cv, references: cv.references.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Personal details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={cv.fullName} onChange={setField("fullName")} />
          <Field
            label="Target job title"
            value={cv.targetJobTitle}
            onChange={setField("targetJobTitle")}
          />
          <Field label="Email" value={cv.email} onChange={setField("email")} />
          <Field label="Phone" value={cv.phone} onChange={setField("phone")} />
          <Field
            label="Location"
            value={cv.location}
            onChange={setField("location")}
          />
        </div>
      </section>

      <section className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Professional summary
        </h3>
        <textarea
          className="field h-28"
          value={cv.summary || ""}
          onChange={setField("summary")}
          placeholder="A short paragraph describing the client's background."
        />
      </section>

      <section className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Skills (one per line)
        </h3>
        <textarea
          className="field h-28"
          value={arrayToLines(cv.skills)}
          onChange={setArrayField("skills")}
        />
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Work experience
          </h3>
          <button
            type="button"
            onClick={addExperience}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            + Add job
          </button>
        </div>
        <div className="space-y-4">
          {cv.experience.map((job, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Job title"
                  value={job.title}
                  onChange={(e) => updateExperience(index, "title", e.target.value)}
                />
                <Field
                  label="Company"
                  value={job.company}
                  onChange={(e) =>
                    updateExperience(index, "company", e.target.value)
                  }
                />
                <Field
                  label="Location"
                  value={job.location}
                  onChange={(e) =>
                    updateExperience(index, "location", e.target.value)
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Start"
                    value={job.startDate}
                    onChange={(e) =>
                      updateExperience(index, "startDate", e.target.value)
                    }
                  />
                  <Field
                    label="End"
                    value={job.endDate}
                    onChange={(e) =>
                      updateExperience(index, "endDate", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">Key points (one per line)</label>
                <textarea
                  className="field h-24"
                  value={arrayToLines(job.bullets)}
                  onChange={(e) =>
                    updateExperience(
                      index,
                      "bullets",
                      linesToArray(e.target.value)
                    )
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => removeExperience(index)}
                className="mt-3 text-xs font-medium text-red-600 hover:underline"
              >
                Remove this job
              </button>
            </div>
          ))}
          {cv.experience.length === 0 ? (
            <p className="text-sm text-slate-500">No work experience added.</p>
          ) : null}
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Education</h3>
          <button
            type="button"
            onClick={addEducation}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            + Add education
          </button>
        </div>
        <div className="space-y-4">
          {cv.education.map((item, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Qualification"
                  value={item.qualification}
                  onChange={(e) =>
                    updateEducation(index, "qualification", e.target.value)
                  }
                />
                <Field
                  label="Institution"
                  value={item.institution}
                  onChange={(e) =>
                    updateEducation(index, "institution", e.target.value)
                  }
                />
                <Field
                  label="Location"
                  value={item.location}
                  onChange={(e) =>
                    updateEducation(index, "location", e.target.value)
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Start"
                    value={item.startDate}
                    onChange={(e) =>
                      updateEducation(index, "startDate", e.target.value)
                    }
                  />
                  <Field
                    label="End"
                    value={item.endDate}
                    onChange={(e) =>
                      updateEducation(index, "endDate", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">Details</label>
                <textarea
                  className="field h-16"
                  value={item.details || ""}
                  onChange={(e) =>
                    updateEducation(index, "details", e.target.value)
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => removeEducation(index)}
                className="mt-3 text-xs font-medium text-red-600 hover:underline"
              >
                Remove this education
              </button>
            </div>
          ))}
          {cv.education.length === 0 ? (
            <p className="text-sm text-slate-500">No education added.</p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-900">
            Qualifications (one per line)
          </h3>
          <textarea
            className="field h-28"
            value={arrayToLines(cv.qualifications)}
            onChange={setArrayField("qualifications")}
          />
        </section>
        <section className="card p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-900">
            Certificates (one per line)
          </h3>
          <textarea
            className="field h-28"
            value={arrayToLines(cv.certificates)}
            onChange={setArrayField("certificates")}
          />
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Projects</h3>
          <button
            type="button"
            onClick={addProject}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            + Add project
          </button>
        </div>
        <div className="space-y-3">
          {cv.projects.map((project, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-4">
              <Field
                label="Project name"
                value={project.name}
                onChange={(e) => updateProject(index, "name", e.target.value)}
              />
              <div className="mt-3">
                <label className="label">Description</label>
                <textarea
                  className="field h-16"
                  value={project.description || ""}
                  onChange={(e) =>
                    updateProject(index, "description", e.target.value)
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => removeProject(index)}
                className="mt-3 text-xs font-medium text-red-600 hover:underline"
              >
                Remove this project
              </button>
            </div>
          ))}
          {cv.projects.length === 0 ? (
            <p className="text-sm text-slate-500">No projects added.</p>
          ) : null}
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">References</h3>
          <button
            type="button"
            onClick={addReference}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            + Add reference
          </button>
        </div>
        <div className="space-y-3">
          {cv.references.map((reference, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2"
            >
              <Field
                label="Name"
                value={reference.name}
                onChange={(e) => updateReference(index, "name", e.target.value)}
              />
              <Field
                label="Contact details"
                value={reference.contact}
                onChange={(e) =>
                  updateReference(index, "contact", e.target.value)
                }
              />
              <button
                type="button"
                onClick={() => removeReference(index)}
                className="text-left text-xs font-medium text-red-600 hover:underline sm:col-span-2"
              >
                Remove this reference
              </button>
            </div>
          ))}
          {cv.references.length === 0 ? (
            <p className="text-sm text-slate-500">No references added.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
