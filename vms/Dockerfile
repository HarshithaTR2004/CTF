FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install terminal-focused tooling for VM labs
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    sudo \
    openssh-server \
    python3 \
    python3-pip \
    build-essential \
    nmap \
    net-tools \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Install ttyd (web terminal)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
      curl -L https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.x86_64 -o /usr/local/bin/ttyd; \
    elif [ "$ARCH" = "aarch64" ]; then \
      curl -L https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.aarch64 -o /usr/local/bin/ttyd; \
    else \
      echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    chmod +x /usr/local/bin/ttyd

# Create a non-root user (no sudoers auto-privilege)
RUN useradd -m -s /bin/bash user && \
    echo "user:password123" | chpasswd

# Create challenge directories
RUN mkdir -p /home/user/challenges /home/user/.vnc && \
    chown -R user:user /home/user

# Set up SSH
RUN mkdir /var/run/sshd && \
    echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config && \
    echo "PermitRootLogin no" >> /etc/ssh/sshd_config

# Create no-op desktop script (terminal-only VM)
RUN cat > /start-vnc.sh <<'EOF'
#!/bin/bash
exit 0
EOF

RUN chmod +x /start-vnc.sh && chown user:user /start-vnc.sh

# Create VM setup script (no plaintext flag files on disk)
RUN cat > /setup-flags.sh <<'EOF'
#!/bin/bash
set -e

mkdir -p /home/user/challenges /home/user/.vm_proofs

cat > /home/user/welcome.txt <<'EOF2'
Welcome to the CyberRangeX Linux VM Challenge Environment!

VM flags are locked until you generate the in-VM proof.
The CTF UI will show the exact unlock command for this challenge.

After unlocking, the flag is available at:
  /home/user/challenges/unlocked_flag.txt

After you copy your personal attest token from the CTF page:
  /usr/local/bin/unlock_flag <unlockId> <attestToken>
EOF2

chown -R user:user /home/user/*
EOF

RUN chmod +x /setup-flags.sh

# Create an in-VM unlocker (runs as root; maps unlockId -> token, then writes a single flag)
RUN cat > /usr/local/src/unlock_flag.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <errno.h>
#include <ctype.h>
#include <pwd.h>

typedef struct {
  const char *id;
  const char *token;
} UnlockMap;

static const UnlockMap UNLOCKS[] = {
  // Opaque unlock ids (the frontend never shows FLAG{...} tokens)
  {"1000", "linux_dac_umask_e00"},
  {"1001", "ad_spn_kerberoast_e00"},
  {"1002", "pentest_footprint_osfp_e00"},

  {"115", "suid_basic_115"},
  {"116", "sudo_basic_116"},
  {"117", "cron_basic_117"},
  {"118", "env_var_118"},
  {"119", "passwd_writable_119"},
  {"120", "kernel_basic_120"},
  {"121", "sudo_nopasswd_121"},
  {"122", "suid_advanced_122"},
  {"123", "sudo_injection_123"},
  {"124", "cron_path_124"},
  {"125", "ld_preload_125"},
  {"126", "kernel_module_126"},
  {"127", "capabilities_127"},
  {"128", "kernel_advanced_128"},
  {"129", "suid_chain_129"},
  {"130", "sudo_bof_130"},
  {"131", "multi_vector_131"},
  {"132", "system_compromise_132"},
  {"133", "linux_advanced_133"},

  {"096", "ad_enum_basic_096"},
  {"097", "kerberos_basic_097"},
  {"098", "ldap_basic_098"},
  {"099", "ntlm_extract_099"},
  {"100", "lateral_basic_100"},
  {"101", "user_enum_101"},
  {"102", "gpo_enum_102"},
  {"103", "kerberos_ticket_103"},
  {"104", "ldap_injection_104"},
  {"105", "ntlm_relay_105"},
  {"106", "lateral_advanced_106"},
  {"107", "pass_hash_107"},
  {"108", "dc_access_108"},
  {"109", "golden_ticket_109"},
  {"110", "dcsync_110"},
  {"111", "ntlm_advanced_111"},
  {"112", "domain_compromise_112"},
  {"113", "delegation_abuse_113"},
  {"114", "ad_full_pen_114"},

  {"134", "recon_basic_134"},
  {"135", "port_scan_135"},
  {"136", "initial_access_136"},
  {"137", "persistence_basic_137"},
  {"138", "priv_esc_basic_138"},
  {"139", "exfil_basic_139"},
  {"140", "recon_advanced_140"},
  {"141", "initial_multi_141"},
  {"142", "persistence_advanced_142"},
  {"143", "priv_esc_complex_143"},
  {"144", "lateral_tech_144"},
  {"145", "exfil_stealth_145"},
  {"146", "pentest_complete_146"},
  {"147", "persistence_advanced_147"},
  {"148", "system_full_148"},
  {"149", "lateral_advanced_149"},
  {"150", "redteam_complete_150"},
  {"151", "credential_pivot_151"},
  {"152", "redteam_e2e_152"},
};

static int isValidId(const char *s) {
  size_t n = strlen(s);
  if (n == 0 || n > 6) return 0;
  for (size_t i = 0; i < n; i++) {
    if (!isdigit((unsigned char)s[i])) return 0;
  }
  return 1;
}

static const char* findTokenForId(const char *id) {
  size_t count = sizeof(UNLOCKS) / sizeof(UNLOCKS[0]);
  for (size_t i = 0; i < count; i++) {
    if (strcmp(UNLOCKS[i].id, id) == 0) {
      return UNLOCKS[i].token;
    }
  }
  return NULL;
}

int main(int argc, char *argv[]) {
  if (argc != 2) {
    fprintf(stderr, "Usage: %s <unlockId>\\n", argv[0]);
    return 2;
  }

  const char *id = argv[1];
  if (!isValidId(id)) {
    fprintf(stderr, "Invalid unlockId format.\\n");
    return 3;
  }

  const char *token = findTokenForId(id);
  if (!token) {
    fprintf(stderr, "Unknown unlockId.\\n");
    return 1;
  }

  char dest[512];
  char marker[512];
  char flagBuf[512];

  snprintf(dest, sizeof(dest), "/home/user/challenges/unlocked_flag.txt");
  snprintf(marker, sizeof(marker), "/home/user/.vm_proofs/%s.done", id);
  snprintf(flagBuf, sizeof(flagBuf), "FLAG{%s}\n", token);

  mkdir("/home/user/challenges", 0755);
  mkdir("/home/user/.vm_proofs", 0755);

  int destFd = open(dest, O_WRONLY | O_CREAT | O_TRUNC, 0644);
  if (destFd < 0) {
    fprintf(stderr, "Failed to open destination file: %s\\n", strerror(errno));
    return 4;
  }

  ssize_t w = write(destFd, flagBuf, strlen(flagBuf));
  if (w != (ssize_t)strlen(flagBuf)) {
    fprintf(stderr, "Write failed\\n");
    close(destFd);
    return 5;
  }

  close(destFd);

  int mFd = open(marker, O_WRONLY | O_CREAT | O_TRUNC, 0644);
  if (mFd >= 0) {
    const char *msg = "unlocked\\n";
    write(mFd, msg, strlen(msg));
    close(mFd);
  }

  struct passwd *pw = getpwnam("user");
  if (pw) {
    chown(dest, pw->pw_uid, pw->pw_gid);
    chown(marker, pw->pw_uid, pw->pw_gid);
  }

  printf("Unlocked flag for unlockId: %s\\n", id);
  return 0;
}
EOF

COPY unlock_flag_wrapper.sh /usr/local/bin/unlock_flag
RUN gcc -O2 -o /usr/local/bin/unlock_flag_bin /usr/local/src/unlock_flag.c && \
    chown root:root /usr/local/bin/unlock_flag_bin && \
    chmod 4755 /usr/local/bin/unlock_flag_bin && \
    chown root:root /usr/local/bin/unlock_flag && \
    chmod 755 /usr/local/bin/unlock_flag

# Create a startup script: start SSH + ttyd
RUN cat > /start.sh <<'EOF'
#!/bin/bash
set -e
service ssh start
/setup-flags.sh

# Run ttyd bound to 0.0.0.0 so host can reach it
nohup su - user -c "/usr/local/bin/ttyd -p 4200 -i 0.0.0.0 bash" >> /var/log/ttyd.log 2>&1 &
sleep 3

tail -f /dev/null
EOF

RUN chmod +x /start.sh

# Expose ports: SSH, Web Terminal
EXPOSE 22 4200

# Container marked healthy when ttyd is up
HEALTHCHECK --interval=15s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -sf http://127.0.0.1:4200/ > /dev/null || exit 1

CMD ["/start.sh"]
