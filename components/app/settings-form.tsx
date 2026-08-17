"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Title } from "@/components/ui/title"
import { Text } from "@/components/ui/text"
import { Select } from "@/components/ui/select"
import { useRouter, usePathname } from "@/i18n/navigation"
import { routing, LOCALE_LABELS, type Locale } from "@/i18n/routing"
import { TextField } from "@/components/ui/text-field"
import {
  updateSettingsProfile,
  changePassword,
  deleteAccount,
} from "@/lib/actions/settings"
import { useLogout } from "@/lib/hooks/use-logout"

const profileSchema = z.object({
  fullName: z.string().min(1),
})
type ProfileValues = z.infer<typeof profileSchema>

const securitySchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(8),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "mismatch",
  })
type SecurityValues = z.infer<typeof securitySchema>

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <Title as="h4">{title}</Title>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export type SettingsProfile = {
  fullName: string
}

export function SettingsForm({
  profile: initialProfile,
}: {
  /** Profil réel de l'utilisateur connecté (chargé côté serveur). */
  profile: SettingsProfile
}) {
  const t = useTranslations("settings")
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const profile = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialProfile,
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState(false)
  const [savingProfile, startSaveProfile] = useTransition()
  const [pwdState, setPwdState] = useState<
    null | "ok" | "wrong" | "noPwd" | "failed"
  >(null)
  const [savingPwd, startSavePwd] = useTransition()
  const [deleteEmail, setDeleteEmail] = useState("")
  const [deleteError, setDeleteError] = useState(false)
  const [deleting, startDelete] = useTransition()
  const security = useForm<SecurityValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: { current: "", next: "", confirm: "" },
  })
  const { logout, signingOut } = useLogout()

  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {/* Left column */}
        <div className="space-y-4">
          <form
            onSubmit={profile.handleSubmit((values) =>
              startSaveProfile(async () => {
                setProfileSaved(false)
                setProfileError(false)
                const res = await updateSettingsProfile(values)
                if (res.ok) {
                  setProfileSaved(true)
                  profile.reset(values)
                  router.refresh()
                } else setProfileError(true)
              }),
            )}
            noValidate
          >
            <Card title={t("profile")}>
              <div className="grid grid-cols-1 gap-3.5">
                <TextField
                  label={t("fullName")}
                  registration={profile.register("fullName")}
                />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  type="submit"
                  variant="subtle"
                  size="sm"
                  disabled={savingProfile}
                >
                  {savingProfile ? `${t("save")}…` : t("save")}
                </Button>
                {profileSaved ? (
                  <span className="text-xs font-semibold text-success">
                    {t("saved")}
                  </span>
                ) : null}
                {profileError ? (
                  <span className="text-xs text-danger">{t("saveError")}</span>
                ) : null}
              </div>
            </Card>
          </form>

          <form
            onSubmit={security.handleSubmit((values) =>
              startSavePwd(async () => {
                setPwdState(null)
                const res = await changePassword({
                  current: values.current,
                  next: values.next,
                })
                if (res.ok) {
                  setPwdState("ok")
                  security.reset()
                } else {
                  setPwdState(
                    res.reason === "wrong_current"
                      ? "wrong"
                      : res.reason === "no_password_account"
                        ? "noPwd"
                        : "failed",
                  )
                }
              }),
            )}
            noValidate
          >
            <Card title={t("security")}>
              <div className="space-y-3.5">
                <TextField
                  label={t("currentPassword")}
                  type="password"
                  registration={security.register("current")}
                />
                <TextField
                  label={t("newPassword")}
                  type="password"
                  registration={security.register("next")}
                />
                <TextField
                  label={t("confirmPassword")}
                  type="password"
                  registration={security.register("confirm")}
                  error={
                    security.formState.errors.confirm
                      ? t("passwordMismatch")
                      : undefined
                  }
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  variant="subtle"
                  size="sm"
                  disabled={savingPwd}
                >
                  {savingPwd ? `${t("updatePassword")}…` : t("updatePassword")}
                </Button>
                {pwdState === "ok" ? (
                  <span className="text-xs font-semibold text-success">
                    {t("passwordChanged")}
                  </span>
                ) : null}
                {pwdState === "wrong" ? (
                  <span className="text-xs text-danger">
                    {t("passwordWrongCurrent")}
                  </span>
                ) : null}
                {pwdState === "noPwd" ? (
                  <span className="text-xs text-danger">
                    {t("passwordNoAccount")}
                  </span>
                ) : null}
                {pwdState === "failed" ? (
                  <span className="text-xs text-danger">{t("saveError")}</span>
                ) : null}
              </div>
            </Card>
          </form>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card title={t("preferences")}>
            <Select
              label={t("interfaceLanguage")}
              value={locale}
              disabled={isPending}
              onChange={(e) => {
                const next = e.target.value as Locale
                startTransition(() =>
                  router.replace(pathname, { locale: next }),
                )
              }}
              options={routing.locales.map((l) => ({
                value: l,
                label: LOCALE_LABELS[l],
              }))}
            />
          </Card>

          {/* Compte */}
          <Card title={t("account")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Text size="sm" tone="ink" className="font-medium">
                  {t("logout")}
                </Text>
                <Text size="xs">{t("logoutNote")}</Text>
              </div>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={logout}
                disabled={signingOut}
                className="shrink-0 font-semibold"
              >
                {t("logout")}
              </Button>
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Text size="sm" className="font-medium text-danger">
                  {t("deleteAccount")}
                </Text>
                <Text size="xs">{t("deleteAccountNote")}</Text>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-[38px] shrink-0 rounded-lg border border-danger/40 px-4 text-xs font-semibold text-danger transition-colors hover:bg-danger hover:text-paper"
              >
                {t("deleteAccount")}
              </button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("deleteAccount")}
        size="sm"
      >
        <Text size="sm" leading>
          {t.rich("deleteModalBody", {
            b: (c) => <b className="font-semibold text-ink">{c}</b>,
          })}
        </Text>
        {/* Ressaisie de l'e-mail : un clic seul ne doit jamais suffire à
            déclencher un effacement irréversible. */}
        <div className="mt-5">
          <TextField
            label={t("deleteConfirmEmail")}
            registration={{
              name: "confirmEmail",
              onChange: async (e: { target: { value: string } }) => {
                setDeleteEmail(e.target.value)
              },
              onBlur: async () => {},
              ref: () => {},
            }}
          />
          {deleteError ? (
            <p className="mt-2 text-xs text-danger">{t("deleteError")}</p>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            type="button"
            variant="subtle"
            size="sm"
            disabled={deleting}
            onClick={() => setConfirmDelete(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={deleting || !deleteEmail.trim()}
            onClick={() =>
              startDelete(async () => {
                setDeleteError(false)
                const res = await deleteAccount({ confirmEmail: deleteEmail })
                if (res.ok) window.location.href = "/"
                else setDeleteError(true)
              })
            }
          >
            {deleting ? `${t("deleteConfirm")}…` : t("deleteConfirm")}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
