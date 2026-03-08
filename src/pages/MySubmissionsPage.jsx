import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useLang } from "@/i18n"
import { supabase, hasSupabase } from "@/lib/supabase"
import { RAIDS } from "@/lib/raids"
import Button from "@/components/ui/Button"
import styles from "./MySubmissionsPage.module.css"

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
  } catch { return iso }
}

const RAID_MAP = Object.fromEntries(RAIDS.map(r => [r.slug, r]))

const SERVER_COLORS = { undercity: "#7c6ce0", dragonveil: "#e06c5a" }

const STATUS_COLORS = {
  pending:  { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  approved: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)"  },
  rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)"  },
}

export default function MySubmissionsPage() {
  const { user, isAuthenticated } = useAuth()
  const { t, lang } = useLang()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return }
    supabase
      .from("raid_records")
      .select("id, raid_slug, server, team_members, time_seconds, submitted_at, status, admin_note")
      .eq("submitted_by", user.id)
      .order("submitted_at", { ascending: false })
      .then(({ data }) => setRecords(data ?? []))
      .finally(() => setLoading(false))
  }, [user?.id])

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.guestMsg}>
          <p>{t("submissions.loginRequired")}</p>
          <Link to="/auth?mode=login">
            <Button variant="solid">{t("nav.signIn")}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>{t("submissions.title")}</h1>
        <p className={styles.sub}>{t("submissions.sub")}</p>
      </section>

      <div className={styles.list}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.card} ${styles.cardSkeleton}`} />
          ))
        ) : records.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📋</span>
            <span>{t("submissions.empty")}</span>
          </div>
        ) : (
          records.map(rec => {
            const raid = RAID_MAP[rec.raid_slug]
            const raidName = raid ? (raid[lang] ?? raid.en) : rec.raid_slug
            const statusStyle = STATUS_COLORS[rec.status] ?? STATUS_COLORS.pending
            return (
              <div key={rec.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.cardRaid}>{raidName}</span>
                  <div className={styles.cardHeadRight}>
                    <span
                      className={styles.cardServer}
                      style={{ color: SERVER_COLORS[rec.server], borderColor: SERVER_COLORS[rec.server] + "55" }}
                    >
                      {t(`raids.server.${rec.server}`)}
                    </span>
                    <span
                      className={styles.cardStatus}
                      style={{ color: statusStyle.color, background: statusStyle.bg, borderColor: statusStyle.border }}
                    >
                      {t(`admin.status.${rec.status}`)}
                    </span>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <span className={styles.cardMeta}>⏱ {formatTime(rec.time_seconds)}</span>
                  <span className={styles.cardMeta}>👥 {rec.team_members.join(", ")}</span>
                  <span className={styles.cardMeta}>📅 {formatDate(rec.submitted_at)}</span>
                </div>

                {rec.status === "rejected" && rec.admin_note && (
                  <div className={styles.cardNote}>
                    <span className={styles.cardNoteLabel}>{t("submissions.rejectedNote")}</span>
                    {rec.admin_note}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
