#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAURI_CONF="${ROOT_DIR}/src-tauri/tauri.conf.json"
TEMPLATE="${ROOT_DIR}/packaging/aur/PKGBUILD.template"
INSTALL_TEMPLATE="${ROOT_DIR}/packaging/aur/s3man.install"
OUTPUT_DIR="${ROOT_DIR}/dist/aur"

if [[ ! -f "${TAURI_CONF}" ]]; then
  echo "Missing ${TAURI_CONF}" >&2
  exit 1
fi

if [[ ! -f "${TEMPLATE}" ]]; then
  echo "Missing ${TEMPLATE}" >&2
  exit 1
fi

APP_NAME="$(node -p "const c=require('${TAURI_CONF}'); c.productName.toLowerCase()")"
VERSION="$(node -p "const c=require('${TAURI_CONF}'); c.version")"
RELEASE_TAG="${RELEASE_TAG:-v${VERSION}}"
RELEASE_BASE_URL="${RELEASE_BASE_URL:-https://github.com/OWNER/REPO/releases/download/${RELEASE_TAG}}"

DEB_AMD64="${APP_NAME}_${VERSION}_amd64.deb"
DEB_ARM64="${APP_NAME}_${VERSION}_arm64.deb"
DEB_AMD64_PATH="${ROOT_DIR}/src-tauri/target/release/bundle/deb/${DEB_AMD64}"
DEB_ARM64_PATH="${ROOT_DIR}/src-tauri/target/release/bundle/deb/${DEB_ARM64}"

SHA_AMD64="${SHA_AMD64:-}"
SHA_ARM64="${SHA_ARM64:-}"

if [[ -z "${SHA_AMD64}" && -f "${DEB_AMD64_PATH}" ]]; then
  SHA_AMD64="$(sha256sum "${DEB_AMD64_PATH}" | cut -d' ' -f1)"
fi

if [[ -z "${SHA_ARM64}" && -f "${DEB_ARM64_PATH}" ]]; then
  SHA_ARM64="$(sha256sum "${DEB_ARM64_PATH}" | cut -d' ' -f1)"
fi

if [[ -z "${SHA_AMD64}" ]]; then
  SHA_AMD64="REPLACE_WITH_AMD64_SHA256"
fi

if [[ -z "${SHA_ARM64}" ]]; then
  SHA_ARM64="REPLACE_WITH_ARM64_SHA256"
fi

mkdir -p "${OUTPUT_DIR}"

sed \
  -e "s|@APP_NAME@|${APP_NAME}|g" \
  -e "s|@VERSION@|${VERSION}|g" \
  -e "s|@RELEASE_BASE_URL@|${RELEASE_BASE_URL}|g" \
  -e "s|@DEB_AMD64@|${DEB_AMD64}|g" \
  -e "s|@DEB_ARM64@|${DEB_ARM64}|g" \
  -e "s|@SHA_AMD64@|${SHA_AMD64}|g" \
  -e "s|@SHA_ARM64@|${SHA_ARM64}|g" \
  "${TEMPLATE}" > "${OUTPUT_DIR}/PKGBUILD"

cp "${INSTALL_TEMPLATE}" "${OUTPUT_DIR}/${APP_NAME}.install"

echo "Generated ${OUTPUT_DIR}/PKGBUILD"
echo "Generated ${OUTPUT_DIR}/${APP_NAME}.install"

if [[ "${SHA_AMD64}" == REPLACE_WITH_AMD64_SHA256 || "${SHA_ARM64}" == REPLACE_WITH_ARM64_SHA256 ]]; then
  echo "Warning: one or more SHA256 values are placeholders." >&2
  echo "Set SHA_AMD64/SHA_ARM64 or build both Debian artifacts first." >&2
fi
