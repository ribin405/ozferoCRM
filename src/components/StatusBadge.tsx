import { STATUS_LABEL, type Status } from "@/lib/constants";

export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge b-${status}`}>{STATUS_LABEL[status]}</span>;
}
