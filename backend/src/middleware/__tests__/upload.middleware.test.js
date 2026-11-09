/**
 * upload.middleware storage modes (no disk, no network):
 *  - cloudinary: content checked in memory, then uploaded; file.path is the URL
 *  - none: a read-only host (Vercel) without Cloudinary refuses files with 503
 *  - every mode: a file whose bytes don't match its type is refused with 400
 */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
const PDF = Buffer.from('%PDF-1.4\n%fake but valid header\n');
const TXT = Buffer.from('hello world');
const HTML_AS_PNG = Buffer.from('<html><script>alert(1)</script></html>');

/** Load the middleware with the given env and a mocked Cloudinary uploader. */
const load = ({ cloudName = "", vercel = false, uploadResult, uploadError } = {}) => {
  let mod;
  const calls = [];
  jest.isolateModules(() => {
    if (vercel) process.env.VERCEL = "1";
    else delete process.env.VERCEL;
    jest.doMock("../../config", () => ({
      cloudinary: { cloudName, apiKey: "k", apiSecret: "s" },
      upload: { maxSize: 4 * 1024 * 1024 },
    }));
    jest.doMock("cloudinary", () => ({
      v2: {
        config: jest.fn(),
        uploader: {
          upload_stream: (options, cb) => ({
            end: (buffer) => {
              calls.push({ options, size: buffer.length });
              if (uploadError) cb(uploadError);
              else cb(null, uploadResult ? uploadResult(options) : { secure_url: `https://res.cloudinary.com/demo/${options.resource_type}/upload/${options.folder}/${options.public_id}${options.format ? `.${options.format}` : ""}`, public_id: `${options.folder}/${options.public_id}` });
            },
          }),
        },
      },
    }));
    mod = require("../upload.middleware");
  });
  return { mod, calls };
};

/** Run the post-multer step (verify + store) on a fake request. */
const run = async (mod, files) => {
  const [, verifyAndStore] = mod.upload.array("files", 5);
  const req = { files };
  const err = await new Promise((resolve) => verifyAndStore(req, {}, resolve));
  return { req, err };
};
const memFile = (fieldname, mimetype, buffer, originalname = "x") => ({ fieldname, mimetype, buffer, originalname, size: buffer.length });

afterEach(() => {
  delete process.env.VERCEL;
  jest.resetModules();
});

describe("storage mode", () => {
  test("Cloudinary when configured, even on Vercel", () => {
    expect(load({ cloudName: "demo", vercel: true }).mod.STORAGE_MODE).toBe("cloudinary");
  });
  test("disk locally without Cloudinary", () => {
    expect(load().mod.STORAGE_MODE).toBe("disk");
  });
  test("none on a read-only host without Cloudinary", () => {
    expect(load({ vercel: true }).mod.STORAGE_MODE).toBe("none");
  });
});

describe("cloudinary mode", () => {
  test("an image is checked, uploaded as an image with its MIME extension, and file.path becomes the URL", async () => {
    const { mod, calls } = load({ cloudName: "demo" });
    const file = memFile("logo", "image/png", PNG, "evil.html");
    const { err } = await run(mod, [file]);
    expect(err).toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(calls[0].options).toMatchObject({ resource_type: "image", format: "png", folder: "sms/logo", overwrite: false });
    expect(calls[0].options.public_id).toMatch(/^logo-\d+-\d+$/); // never the client's name
    expect(file.path).toMatch(/^https:\/\/res\.cloudinary\.com\/.*\.png$/);
    expect(file.filename).toMatch(/^sms\/logo\/logo-\d+-\d+\.png$/);
    expect(file.buffer).toBeUndefined(); // released after upload
  });

  test("a PDF is viewable (image type); office and text files are raw with the extension in the id", async () => {
    const { mod, calls } = load({ cloudName: "demo" });
    await run(mod, [memFile("files", "application/pdf", PDF), memFile("files", "text/plain", TXT)]);
    expect(calls.map((c) => c.options.resource_type)).toEqual(["image", "raw"]);
    expect(calls[0].options.format).toBe("pdf");
    expect(calls[1].options.format).toBeUndefined();
    expect(calls[1].options.public_id).toMatch(/\.txt$/);
  });

  test("content that does not match the declared type is refused and nothing is uploaded", async () => {
    const { mod, calls } = load({ cloudName: "demo" });
    const { err } = await run(mod, [memFile("files", "application/pdf", PDF), memFile("files", "image/png", HTML_AS_PNG)]);
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/does not match its declared type/);
    expect(calls).toHaveLength(0);
  });

  test("a Cloudinary failure is a 502, not a crash", async () => {
    const { mod } = load({ cloudName: "demo", uploadError: new Error("boom") });
    const { err } = await run(mod, [memFile("avatar", "image/png", PNG)]);
    expect(err.statusCode).toBe(502);
  });

  test("requests without files pass straight through", async () => {
    const { mod, calls } = load({ cloudName: "demo" });
    const { err } = await run(mod, []);
    expect(err).toBeUndefined();
    expect(calls).toHaveLength(0);
  });
});

describe("none mode (read-only host, no Cloudinary)", () => {
  test("a request carrying a file gets 503; one without files works", async () => {
    const { mod } = load({ vercel: true });
    expect((await run(mod, [memFile("avatar", "image/png", PNG)])).err.statusCode).toBe(503);
    expect((await run(mod, [])).err).toBeUndefined();
  });
});

describe("contentMatchesType", () => {
  test("checks magic bytes per type", () => {
    const { mod } = load();
    expect(mod.contentMatchesType("image/png", PNG)).toBe(true);
    expect(mod.contentMatchesType("image/png", HTML_AS_PNG)).toBe(false);
    expect(mod.contentMatchesType("application/pdf", PDF)).toBe(true);
    expect(mod.contentMatchesType("text/plain", Buffer.from([0x61, 0x00]))).toBe(false);
    expect(mod.contentMatchesType("application/x-sh", TXT)).toBe(false);
  });
});
