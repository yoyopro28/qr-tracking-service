import Link from "next/link";

type ShortcodeLookupFormProps = {
  initialShortcode?: string;
};

export function ShortcodeLookupForm({ initialShortcode = "" }: ShortcodeLookupFormProps) {
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Scan or enter shortcode</h2>
          <p className="sectionCopy">
            Use this admin page as the activation entry. The camera scanner reads the
            public QR locally and opens this form without logging a public scan.
          </p>
        </div>
      </div>

      <form action="/admin/activation" className="stackForm">
        <label className="field">
          <span className="fieldLabel">Flyer shortcode</span>
          <input
            className="input"
            type="text"
            name="shortcode"
            required
            defaultValue={initialShortcode}
            placeholder="AB12CD34"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>

        <div className="formActions">
          <button className="button" type="submit">
            Resolve flyer
          </button>
          <Link className="button button--secondary" href="/admin/activation/scan">
            Scan with camera
          </Link>
        </div>
      </form>
    </section>
  );
}
