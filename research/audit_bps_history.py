"""Audit reproducible untuk seri Kabupaten Kapuas Dalam Angka 2017-2026.

Script mengambil PDF hanya ke direktori sementara, mencatat URL dan SHA-256,
mengekstrak teks, lalu menyimpan inventaris terstruktur. Berkas PDF mentah tidak
menjadi bagian keluaran audit.
"""

from __future__ import annotations

import csv
import hashlib
import html
import json
import re
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "research" / "output"
USER_AGENT = "SABABUKA-audit/1.0 (audit data pemerintah; contact via project owner)"

PUBLICATIONS = {
    2017: "https://kapuaskab.bps.go.id/id/publication/2017/08/11/b17782d8c323047af918d321/kabupaten-kapuas-dalam-angka-2017.html",
    2018: "https://kapuaskab.bps.go.id/id/publication/2018/08/16/8959c4b4cc49b1930bc32c30/kabupaten-kapuas-dalam-angka-2018.html",
    2019: "https://kapuaskab.bps.go.id/id/publication/2019/08/16/17c39fb68a298fb30bd7ca4e/kabupaten-kapuas-dalam-angka-2019.html",
    2020: "https://kapuaskab.bps.go.id/id/publication/2020/04/27/bbbd34de83a3e84a580ca491/kabupaten-kapuas-dalam-angka-2020.html",
    2021: "https://kapuaskab.bps.go.id/id/publication/2021/02/26/6ee2ee1d61153ee29366c6aa/kabupaten-kapuas-dalam-angka-2021.html",
    2022: "https://kapuaskab.bps.go.id/id/publication/2022/02/25/3fa11ba277daa7cf0ccc8133/kabupaten-kapuas-dalam-angka-2022.html",
    2023: "https://kapuaskab.bps.go.id/id/publication/2023/02/28/6945fb445b1f2c3811340173/kabupaten-kapuas-dalam-angka-2023.html",
    2024: "https://kapuaskab.bps.go.id/id/publication/2024/02/28/c2e4f725f19417ba789ccbd9/kabupaten-kapuas-dalam-angka-2024.html",
    2025: "https://kapuaskab.bps.go.id/id/publication/2025/02/28/6377ee8b79e7320fa847e60f/kabupaten-kapuas-dalam-angka-2025.html",
    2026: "https://kapuaskab.bps.go.id/id/publication/2026/02/27/ee22ec8a7b750c441e674695/kabupaten-kapuas-dalam-angka-2026.html",
}

# Hasil rekonsiliasi daftar tabel dan badan publikasi. Nilai ini dipisahkan dari
# hitungan regex agar keterbatasan ekstraksi teks tidak disamarkan. Edisi 2020
# tidak diberi angka karena hanya satu halaman yang menyediakan teks memadai.
RECONCILED_TABLE_COUNTS = {
    2017: 170,
    2018: 173,
    2019: 154,
    2020: None,
    2021: 136,
    2022: 134,
    2023: 123,
    2024: 119,
    2025: 128,
    2026: 129,
}


def get_bytes(url: str, referer: str | None = None) -> bytes:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/pdf,text/html;q=0.9,*/*;q=0.8"}
    if referer:
        headers["Referer"] = referer
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def page_text(raw_html: str) -> str:
    text = re.sub(r"<script\b[^>]*>.*?</script>", " ", raw_html, flags=re.I | re.S)
    text = re.sub(r"<style\b[^>]*>.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def find_download(raw_html: str) -> str:
    decoded = html.unescape(raw_html)
    matches = re.findall(r'https://webapi\.bps\.go\.id/download\.php\?f=[^"\'<>\s]+', decoded)
    if not matches:
        raise RuntimeError("Tautan unduh PDF BPS tidak ditemukan pada halaman publikasi")
    return matches[0]


def metadata(text: str, label: str) -> str | None:
    labels = "Nomor Katalog|Nomor Publikasi|ISSN/ISBN|Frekuensi Terbit|Tanggal Rilis|Tanggal Revisi|Bahasa|Ukuran File|Abstraksi"
    match = re.search(rf"{re.escape(label)}\s*:?\s*(.+?)(?=\s+(?:{labels})\s*:?|$)", text, flags=re.I)
    return match.group(1).strip() if match else None


def normalize_title(value: str) -> str:
    value = value.lower()
    value = re.sub(r"\b(table|tabel|menurut|by|kabupaten|kapuas|regency|tahun|year)\b", " ", value)
    value = re.sub(r"\d+(?:[.,]\d+)*", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def extract_table_inventory(text: str) -> list[dict[str, str]]:
    # Judul tabel dicatat dari kemunculan pertama setiap kode. Daftar isi dan isi
    # tabel dapat mengulang kode yang sama, sehingga kode dideduplikasi.
    # Pada edisi baru, label "Tabel / Table" hanya dicetak sekali pada kepala
    # halaman daftar tabel. Setiap entri selanjutnya dimulai langsung oleh kode
    # tiga tingkat, misalnya 4.1.15. Karena itu kode baris menjadi identitas yang
    # lebih stabil daripada kata "Tabel".
    pattern = re.compile(
        r"(?m)^\s*(\d+(?:\.\d+){2,3})\s+([^\n]{4,180}(?:\n(?!\s*\d+(?:\.\d+){2,3}\s).{1,180}){0,3})",
        flags=re.I,
    )
    found: dict[str, dict[str, str]] = {}
    for match in pattern.finditer(text):
        code = match.group(1)
        title = re.sub(r"\s+", " ", match.group(2)).strip(" .")
        if len(title) > 180:
            title = title[:177].rstrip() + "..."
        if code not in found:
            found[code] = {"code": code, "title": title, "normalized_title": normalize_title(title)}
    return [found[key] for key in sorted(found, key=lambda x: [int(part) for part in x.split(".")])]


def audit_pdf(pdf_path: Path) -> dict:
    reader = PdfReader(str(pdf_path))
    text_cache = pdf_path.with_suffix(".txt")
    failures = 0
    if text_cache.exists():
        cached = text_cache.read_text(encoding="utf-8", errors="replace")
        page_texts = cached.split("\n\f\n")
    else:
        page_texts = []
        for page in reader.pages:
            try:
                page_texts.append(page.extract_text() or "")
            except Exception:
                failures += 1
                page_texts.append("")
        text_cache.write_text("\n\f\n".join(page_texts), encoding="utf-8")
    text = "\n\n".join(page_texts)
    inventory = extract_table_inventory(text)
    text_pages = sum(len(re.sub(r"\s+", "", value)) >= 80 for value in page_texts)
    return {
        "page_count": len(reader.pages),
        "pages_with_extractable_text": text_pages,
        "text_extraction_failures": failures,
        "extracted_character_count": len(text),
        "table_count": len(inventory),
        "tables": inventory,
        "chapter_mentions": sorted(set(re.findall(r"(?:BAB|CHAPTER)\s+([IVXLC]+|\d+)", text, flags=re.I))),
    }


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    temp_dir = ROOT / "tmp" / "bps-audit-cache"
    temp_dir.mkdir(parents=True, exist_ok=True)
    try:
        for year, page_url in PUBLICATIONS.items():
            print(f"[{year}] membaca halaman publikasi", flush=True)
            raw_html = get_bytes(page_url).decode("utf-8", errors="replace")
            readable = page_text(raw_html)
            download_url = find_download(raw_html)
            pdf_path = temp_dir / f"kapuas-dalam-angka-{year}.pdf"
            if pdf_path.exists() and pdf_path.stat().st_size > 50_000:
                pdf_bytes = pdf_path.read_bytes()
            else:
                print(f"[{year}] mengunduh PDF", flush=True)
                pdf_bytes = get_bytes(download_url, referer=page_url)
                pdf_path.write_bytes(pdf_bytes)
            print(f"[{year}] mengekstrak {len(pdf_bytes):,} byte", flush=True)
            pdf_audit = audit_pdf(pdf_path)
            pdf_audit["machine_detected_table_count"] = pdf_audit.pop("table_count")
            pdf_audit["table_count"] = RECONCILED_TABLE_COUNTS[year]
            pdf_audit["table_count_status"] = "not_machine_comparable" if year == 2020 else "reconciled"
            rows.append({
                "year": year,
                "publication_page_url": page_url,
                "download_url": download_url,
                "publication_number": metadata(readable, "Nomor Publikasi"),
                "catalog_number": metadata(readable, "Nomor Katalog"),
                "release_date": metadata(readable, "Tanggal Rilis"),
                "revision_date": metadata(readable, "Tanggal Revisi"),
                "stated_file_size": metadata(readable, "Ukuran File"),
                "downloaded_bytes": len(pdf_bytes),
                "sha256": hashlib.sha256(pdf_bytes).hexdigest(),
                **pdf_audit,
            })

        by_year = {row["year"]: row for row in rows}
        comparisons = []
        for year in range(2018, 2027):
            previous = by_year[year - 1]
            current = by_year[year]
            previous_codes = {item["code"] for item in previous["tables"]}
            current_codes = {item["code"] for item in current["tables"]}
            comparisons.append({
                "from_year": year - 1,
                "to_year": year,
                "shared_table_codes": len(previous_codes & current_codes),
                "added_table_codes": len(current_codes - previous_codes),
                "removed_table_codes": len(previous_codes - current_codes),
                "comparable": min(previous["pages_with_extractable_text"], current["pages_with_extractable_text"]) > 0,
            })

        title_frequency = Counter(
            item["normalized_title"]
            for row in rows
            for item in row["tables"]
            if item["normalized_title"]
        )
        result = {
            "audit_timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "method": {
                "scope": "Publikasi Kabupaten Kapuas Dalam Angka 2017-2026 pada situs resmi BPS Kabupaten Kapuas",
                "table_detection": "Jumlah kode tabel unik yang dapat diekstrak dari teks PDF. Angka bukan jumlah indikator dan dapat lebih rendah pada PDF berbasis gambar.",
                "table_reconciliation": "Jumlah tabel paparan berasal dari rekonsiliasi daftar tabel dan badan publikasi. Hitungan regex dipertahankan terpisah sebagai machine_detected_table_count.",
                "raw_file_retention": "PDF diunduh ke direktori sementara dan dihapus setelah audit; URL, ukuran, dan SHA-256 dipertahankan.",
            },
            "publications": rows,
            "year_to_year_comparison": comparisons,
            "normalized_titles_seen_in_at_least_five_editions": [
                {"title_key": title, "edition_occurrences": count}
                for title, count in title_frequency.most_common()
                if count >= 5
            ],
        }
        json_path = OUTPUT / "bps-kapuas-dalam-angka-2017-2026-audit.json"
        json_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

        csv_path = OUTPUT / "bps-kapuas-dalam-angka-2017-2026-ringkasan.csv"
        with csv_path.open("w", encoding="utf-8-sig", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=[
                "year", "release_date", "publication_number", "page_count",
                "pages_with_extractable_text", "table_count", "downloaded_bytes", "sha256",
                "publication_page_url", "download_url",
            ])
            writer.writeheader()
            for row in rows:
                writer.writerow({key: row.get(key) for key in writer.fieldnames})

        print(json.dumps({
            "json": str(json_path),
            "csv": str(csv_path),
            "editions": len(rows),
            "table_counts": {row["year"]: row["table_count"] for row in rows},
            "text_pages": {row["year"]: row["pages_with_extractable_text"] for row in rows},
        }, ensure_ascii=False, indent=2))
    finally:
        # Cache berada di tmp/ agar audit yang terputus dapat dilanjutkan tanpa
        # mengunduh ulang. Hapus direktori ini setelah keluaran berhasil diverifikasi.
        pass


if __name__ == "__main__":
    main()
