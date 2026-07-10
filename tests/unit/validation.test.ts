import { describe, it, expect } from "vitest";
import { submissionSchema } from "@/lib/validation";

describe("submissionSchema", () => {
  it("accepts a rating with attribution params", () => {
    const r = submissionSchema.safeParse({ rating: 5, e: "test", b: "daps", c: "7" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.rating).toBe(5);
      expect(r.data.e).toBe("test");
      expect(r.data.email).toBeNull();
    }
  });

  it("treats empty/missing email as null (email is optional)", () => {
    expect(submissionSchema.safeParse({ rating: 3, email: "" }).data?.email).toBeNull();
    expect(submissionSchema.safeParse({ rating: 3 }).data?.email).toBeNull();
  });

  it("normalizes a valid email (trim + lowercase)", () => {
    const r = submissionSchema.safeParse({ rating: 3, email: "  Foo@Bar.COM " });
    expect(r.data?.email).toBe("foo@bar.com");
  });

  it("rejects a malformed email", () => {
    expect(submissionSchema.safeParse({ rating: 3, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects ratings outside 1–5 and non-integers", () => {
    for (const rating of [0, 6, -1, 2.5, "x"]) {
      expect(submissionSchema.safeParse({ rating }).success).toBe(false);
    }
  });

  it("coerces stringified ratings from JSON", () => {
    expect(submissionSchema.safeParse({ rating: "4" }).data?.rating).toBe(4);
  });

  it("empty params become null, not empty strings", () => {
    const r = submissionSchema.safeParse({ rating: 1, e: "", b: "  ", c: "" });
    expect(r.data?.e).toBeNull();
    expect(r.data?.b).toBeNull();
    expect(r.data?.c).toBeNull();
  });

  it("caps param length", () => {
    expect(submissionSchema.safeParse({ rating: 1, e: "x".repeat(65) }).success).toBe(false);
  });
});
