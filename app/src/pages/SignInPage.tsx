import { useEffect } from "react";
import { Alert, Button, Field, Form, Screen, Stack, TextInput } from "@robomotion/app-kit";
import { useSignIn, SignInParamsSchema } from "../generated/actions.gen";
import { useSession } from "../lib/session";
import { navigate } from "../lib/router";

/** The door to the app: the brand on one side, a work email and a password on the other. */
export function SignInPage({ title, logoSrc }: { title: string; logoSrc?: string }) {
  const signIn = useSignIn();
  const { setUser } = useSession();

  useEffect(() => {
    if (signIn.data) {
      setUser(signIn.data);
      navigate("/", { replace: true });
    }
  }, [signIn.data]);

  return (
    <div className="g-door">
      <section className="g-door-art" aria-label="Glacier People">
        <div className="relative z-10 flex items-center gap-3">
          {logoSrc && <img src={logoSrc} alt="" className="h-10 w-10 rounded-xl" />}
          <span className="text-lg font-black tracking-tight">Glacier · People</span>
        </div>

        <div className="relative z-10 max-w-xl">
          <span className="g-eyebrow mb-5">{title}</span>
          <h1>Every new role, from first request to final yes.</h1>
          <p className="g-band-muted mt-6 text-lg max-w-md">
            Hiring managers raise it, People partners shape it, the CPO, CFO and CEO sign it off, and Talent takes it to market.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 max-w-md">
          <div>
            <span className="g-number text-4xl block">1</span>
            <span className="g-band-muted text-xs font-bold block mt-2">form for the hiring manager</span>
          </div>
          <div>
            <span className="g-number text-4xl block">3</span>
            <span className="g-band-muted text-xs font-bold block mt-2">sign-offs, side by side</span>
          </div>
          <div>
            <span className="g-number text-4xl block">7</span>
            <span className="g-band-muted text-xs font-bold block mt-2">days before a reminder</span>
          </div>
        </div>

        <div className="g-door-scoops" aria-hidden="true">
          <span className="g-flavour-rejected" style={{ width: "9rem", height: "9rem", left: "4rem", top: "9rem" }} />
          <span className="g-flavour-approved" style={{ width: "10rem", height: "10rem", left: "10rem", top: "5.5rem" }} />
          <span className="g-flavour-pending" style={{ width: "8rem", height: "8rem", left: "7rem", top: "1rem" }} />
        </div>
      </section>

      <div className="g-door-form">
        <div className="w-full max-w-sm">
          <Screen title="Sign in" description="Use your Glacier work email.">
            <Form action={signIn} schema={SignInParamsSchema} initialValues={{ username: "", password: "" }}>
              <Stack gap={4}>
                <Field name="username" label="Work email" required>
                  <TextInput type="email" placeholder="name@glacierglobal.com" autoComplete="username" />
                </Field>
                <Field name="password" label="Password" required>
                  <TextInput type="password" autoComplete="current-password" />
                </Field>
                {signIn.error && (
                  <Alert variant="error" title="Could not sign in">{signIn.error.message}</Alert>
                )}
                <Button type="submit" variant="primary" className="g-go w-full justify-between" iconRight="arrow-right">
                  Sign in
                </Button>
              </Stack>
            </Form>
          </Screen>
        </div>
      </div>
    </div>
  );
}
