#!/bin/sh
set -e

CERT_DIR=/etc/nginx/certs
mkdir -p "$CERT_DIR"

SAN="DNS:localhost,IP:127.0.0.1"

append_san() {
  entry=$1
  if [ -z "$entry" ]; then
    return 0
  fi
  case "$SAN" in
    *":$entry"*) return 0 ;;
  esac
  case "$entry" in
    *.*.*.*)
      SAN="$SAN,IP:$entry"
      ;;
    *)
      SAN="$SAN,DNS:$entry"
      ;;
  esac
}

OLD_IFS=$IFS
IFS=,
for item in ${CERT_SAN:-}; do
  item=$(echo "$item" | tr -d ' ')
  append_san "$item"
done
IFS=$OLD_IFS

dns_i=1
ip_i=1
alt_names=""
IFS=,
for part in $SAN; do
  part=$(echo "$part" | tr -d ' ')
  case "$part" in
    DNS:*)
      alt_names="${alt_names}DNS.${dns_i} = ${part#DNS:}
"
      dns_i=$((dns_i + 1))
      ;;
    IP:*)
      alt_names="${alt_names}IP.${ip_i} = ${part#IP:}
"
      ip_i=$((ip_i + 1))
      ;;
  esac
done
IFS=$OLD_IFS

cat > /tmp/ca.cnf <<EOF
[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no

[dn]
CN = Dictee LAN CA

[v3_ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
EOF

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/ca-key.pem" \
  -out "$CERT_DIR/ca.pem" \
  -config /tmp/ca.cnf

cat > /tmp/server.cnf <<EOF
[req]
distinguished_name = dn
req_extensions = v3_req
prompt = no

[dn]
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
subjectKeyIdentifier = hash

[alt_names]
${alt_names}
EOF

openssl req -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out /tmp/server.csr \
  -config /tmp/server.cnf

openssl x509 -req -in /tmp/server.csr \
  -CA "$CERT_DIR/ca.pem" \
  -CAkey "$CERT_DIR/ca-key.pem" \
  -CAcreateserial \
  -out "$CERT_DIR/cert.pem" \
  -days 365 \
  -sha256 \
  -extfile /tmp/server.cnf \
  -extensions v3_req

cat "$CERT_DIR/cert.pem" "$CERT_DIR/ca.pem" > "$CERT_DIR/fullchain.pem"
chmod 644 "$CERT_DIR/ca.pem" "$CERT_DIR/cert.pem" "$CERT_DIR/fullchain.pem"
