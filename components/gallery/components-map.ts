import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, StatCard } from "@/components/ui/card"
import { ChartBar } from "@/components/ui/chart-bar"
import { ChartDonut } from "@/components/ui/chart-donut"
import { ChartLine } from "@/components/ui/chart-line"
import { Combobox } from "@/components/ui/combobox"
import { Container } from "@/components/ui/container"
import { Lightbox } from "@/components/ui/lightbox"
import { LocaleMenu } from "@/components/ui/locale-menu"
import { LocaleSwitcher } from "@/components/ui/locale-switcher"
import { Modal } from "@/components/ui/modal"
import { SectionLabel } from "@/components/ui/section-label"
import { Select } from "@/components/ui/select"
import { FieldLabel, TextField } from "@/components/ui/text-field"
import { Text } from "@/components/ui/text"
import { Title } from "@/components/ui/title"

/**
 * T2 (s12-ui-gallery) — the map the gallery renders every primitive from.
 * One entry per component `components/ui/*.tsx` exports. Guarded by
 * components-map.test.ts (source-level, see that file's header comment for
 * why it doesn't import this module at runtime): a component exported from
 * `components/ui` with no entry here fails the suite, and an entry here for
 * a component that no longer exists there fails it too (stale-entry check).
 */
export const COMPONENTS = {
  Badge,
  Button,
  Card,
  StatCard,
  ChartBar,
  ChartDonut,
  ChartLine,
  Combobox,
  Container,
  FieldLabel,
  Lightbox,
  LocaleMenu,
  LocaleSwitcher,
  Modal,
  SectionLabel,
  Select,
  Text,
  TextField,
  Title,
}
