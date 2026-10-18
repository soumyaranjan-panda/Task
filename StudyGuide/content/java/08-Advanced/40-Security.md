# Java Security

Java security spans the language (type safety, access control), the platform (sandbox, strong encapsulation), the runtime (class verification, signed JARs), and cryptography (`java.security`, `javax.crypto`). This module covers the security model, permissions, signatures, the cryptography APIs, common vulnerabilities, and secure coding practices. Security is layered: no single mechanism is sufficient.

## The Java security model

- **Language safety**: strong typing, no pointer arithmetic, array bounds checking, automatic memory management prevent many memory-corruption bugs.
- **Bytecode verifier**: ensures loaded classes are type-safe and don't violate access rules (module 44).
- **Class loaders**: separate namespaces; code from different sources can be isolated (module 05).
- **Security Manager** (deprecated, removed in Java 17): sandboxed untrusted code via `Permission` checks (`checkPermission`). Replaced by strong encapsulation (JPMS) and container/isolation at the OS/container level.
- **Protection domains & permissions**: code source (URL + signers) maps to a protection domain with permissions (`java.security.Permission`, `FilePermission`, `SocketPermission`, `RuntimePermission`, `SecurityPermission`).

## Signed JARs and code signing

JARs can be signed with `jarsigner`; the runtime verifies signatures and grants permissions based on signers. Unsigned or tampered JARs fail verification or run with reduced privileges.

```bash
keytool -genkeypair -alias mykey -keystore store.jks
jarsigner -keystore store.jks myapp.jar mykey
```

## Cryptography APIs

### `java.security` — keys, signatures, digests
- `KeyPairGenerator`, `KeyFactory`, `PublicKey`/`PrivateKey`
- `MessageDigest` (SHA-256, SHA-3)
- `Signature` (digital signatures)
- `SecureRandom` (cryptographically secure random — NOT `java.util.Random` for secrets)

```java
import java.security.*;
import java.util.Base64;

public class CryptoDemo {
    public static void main(String[] args) throws Exception {
        // Digest
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest("hello".getBytes());
        System.out.println("sha256: " + Base64.getEncoder().encodeToString(hash));

        // Secure random
        SecureRandom sr = SecureRandom.getInstanceStrong();
        byte[] nonce = new byte[16];
        sr.nextBytes(nonce);
        System.out.println("nonce: " + Base64.getEncoder().encodeToString(nonce));

        // Key pair + signature
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        KeyPair kp = kpg.generateKeyPair();
        Signature sig = Signature.getInstance("SHA256withRSA");
        sig.initSign(kp.getPrivate());
        sig.update("message".getBytes());
        byte[] signed = sig.sign();
        System.out.println("signed length: " + signed.length);
    }
}
```

### `javax.crypto` — encryption
- `Cipher` (symmetric: AES; asymmetric: RSA), `SecretKey`, `KeyGenerator`, `SecretKeyFactory`, `Mac` (HMAC).

```java
import javax.crypto.*;
import javax.crypto.spec.*;
import java.util.Base64;

public class CipherDemo {
    public static void main(String[] args) throws Exception {
        KeyGenerator kg = KeyGenerator.getInstance("AES");
        kg.init(256);
        SecretKey key = kg.generateKey();

        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
        byte[] ct = c.doFinal("secret".getBytes());
        System.out.println("ciphertext: " + Base64.getEncoder().encodeToString(ct));

        Cipher cd = Cipher.getInstance("AES/GCM/NoPadding");
        cd.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
        System.out.println("plaintext: " + new String(cd.doFinal(ct)));
    }
}
```

**Never use ECB mode** (`AES/ECB/PKCS5Padding`); use GCM (authenticated encryption) or CBC + HMAC (encrypt-then-MAC).

## Key management

- `KeyStore` (`JKS`, `JCEKS`, `PKCS12`) — stores keys/certificates; accessed via `keytool`.
- Hardcoding keys/passwords in source is a critical vulnerability. Use environment variables, secret managers, or HSMs (`javax.crypto` + `SunPKCS11`).

## Common vulnerabilities

| Vulnerability | Cause | Defense |
|---------------|-------|---------|
| Deserialization RCE | `ObjectInputStream` on untrusted data | `ObjectInputFilter` (module 29), avoid Java serialization at trust boundaries |
| SQL injection | string concatenation in queries | `PreparedStatement` (module 13/26) |
| XXE / XML injection | insecure XML parsers | disable external entities, use secure factory |
| Path traversal | user input in file paths | validate/canonicalize paths |
| Weak random | `java.util.Random` for tokens | `SecureRandom.getInstanceStrong()` |
| Weak crypto | DES, MD5, SHA-1, ECB, PKCS1 padding | AES-GCM, SHA-256+, RSA-OAEP |
| Hardcoded secrets | keys in source/config | secret management |
| XXE / XXE | external entity resolution | disallow DOCTYPE/external entities |

## Secure coding practices

- Validate all input (allow-lists, not deny-lists).
- Use parameterized queries (`PreparedStatement`).
- Escape output (XSS) in web templates.
- Use constant-time comparison for secrets (`MessageDigest.isEqual`).
- Prefer immutability for sensitive data; zero out `char[]` passwords (don't use `String` for passwords — strings are immutable and linger in the pool/heap).
- Log nothing sensitive (passwords, tokens, PII).
- Keep dependencies updated (CVEs in libraries).

## The Security Manager (historical)

Removed in Java 17. Previously: `System.setSecurityManager`, `AccessController.checkPermission`, `PrivilegedAction`. Modern replacement: strong encapsulation (`--add-opens` minimal), containers, OS-level isolation, and least-privilege deployment.

## Comparison table

| Mechanism | Protects | Notes |
|-----------|----------|-------|
| Bytecode verifier | Type/memory safety | Always on |
| Class loaders | Code isolation | Module 05 |
| JPMS encapsulation | JDK internals access | `--add-opens` opt-in |
| Security Manager (removed) | Sandbox | Replaced by containers |
| `SecureRandom` | Unpredictable values | Use for tokens/keys |
| `MessageDigest`/`Signature` | Integrity/authenticity | SHA-256+, RSA/ECDSA |
| `Cipher` (GCM) | Confidentiality + integrity | Avoid ECB |

## Common mistakes

- Using `Math.random()`/`java.util.Random` for security tokens.
- `AES/ECB` mode (leaks patterns).
- Logging passwords/tokens.
- Comparing secrets with `String.equals` (timing differences; prefer constant-time where it matters).
- Deserializing untrusted data (see module 29).
- Disabling hostname verification in TLS (`SSLSocket` — module 26).

# Interview Questions

## Beginner

**Q1. What makes Java memory-safe?**

Strong typing, no pointers, array bounds checking, automatic garbage collection, bytecode verification.

**Q2. What is the bytecode verifier?**

Ensures loaded classes are type-safe and don't violate access rules before execution.

**Q3. What is `SecureRandom` and when use it?**

Cryptographically secure random generator; use for keys, tokens, nonces — never `java.util.Random`.

**Q4. What is wrong with `AES/ECB`?**

Identical plaintext blocks produce identical ciphertext (leaks patterns); use `AES/GCM`.

**Q5. Why not store passwords in `String`?**

`String` is immutable and lingers in memory/pool; use `char[]` and zero it after use.

## Intermediate

**Q6. What is `MessageDigest`?**

Computes cryptographic hashes (SHA-256, SHA-3) for integrity.

**Q7. What is `KeyStore`?**

Persistent store for keys and certificates (JKS/JCEKS/PKCS12), managed with `keytool`.

**Q8. What is `ObjectInputFilter`?**

Filters classes during deserialization to block gadget chains (JEP 290, module 29).

**Q9. What is a `MessageAuthenticationCode` (HMAC)?**

Keyed hash for integrity+authenticity (`javax.crypto.Mac`).

**Q10. Why avoid `String.equals` for secret comparison?**

Potential timing differences; use constant-time comparison when comparing secrets.

## Advanced

**Q11. What is the difference between encryption and hashing?**

Encryption is reversible (confidentiality); hashing is one-way (integrity).

**Q12. What is GCM mode?**

Authenticated encryption with associated data (confidentiality + integrity in one mode).

**Q13. What is the Security Manager and why was it removed?**

Sandboxed untrusted code via permissions; removed in Java 17 in favor of strong encapsulation and container isolation.

**Q14. What is a Protection Domain?**

Maps a code source (URL + signers) to a set of permissions.

**Q15. What is `keytool`?**

CLI for managing KeyStore entries (keys, certificates) and signing JARs.

## Expert

**Q16. How does code signing work in Java?**

`jarsigner` signs a JAR with a private key; the runtime verifies the signature and maps signers to permissions via protection domains.

**Q17. What is a hardware security module (HSM) and how does Java use it?**

Tamper-resistant hardware for keys; Java accesses via `SunPKCS11` provider and `javax.crypto`.

**Q18. What is constant-time comparison and why?**

Comparison that takes the same time regardless of input, preventing timing attacks on secrets (e.g., `MessageDigest.isEqual`).

**Q19. How do you prevent XXE in Java XML parsing?**

Disable external entities and DTDs on the parser factory (`setFeature(...)` false).

**Q20. What is the Java Cryptography Architecture (JCA) vs JCE?**

JCA = keys, digests, signatures, certificates (`java.security`). JCE = encryption, key agreement, MAC (`javax.crypto`). Providers plug into both.

## Scenario Based

**Q21. You need to store user passwords. What do you do?**

Never store plaintext. Hash with a slow, salted algorithm (bcrypt/scrypt/Argon2 via libraries like Spring Security or `java.security` providers), never MD5/SHA-1 alone.

**Q22. You must deserialize data from an untrusted network source.**

Don't use Java Serialization. Use JSON/Protobuf. If unavoidable, configure a strict `ObjectInputFilter` allowlist.

**Q23. You need to encrypt data at rest.**

Generate a data-encryption key (AES-GCM), wrap it with a key-encryption key from a KMS/HSM, store the wrapped DEK with ciphertext; rotate keys.

**Q24. Your dependency has a CVE (e.g., Log4Shell).**

Update to a patched version; if unavailable, apply vendor mitigations; isolate the service; monitor for exploitation.

**Q25. You need to generate an API token.**

`SecureRandom.getInstanceStrong()` + Base64 URL-safe encoding (256 bits), store hashed (not plaintext) server-side.

## Output Prediction

**Q26. What does this print?**

```java
import java.security.*;
public class Q26 {
    public static void main(String[] args) throws Exception {
        SecureRandom sr = SecureRandom.getInstanceStrong();
        byte[] b = new byte[4];
        sr.nextBytes(b);
        System.out.println(b.length);
    }
}
```

**Output:**
```
4
```

**Reason:** `nextBytes` fills the 4-byte array; values are random each run.

**Q27. What does this print?**

```java
import java.security.MessageDigest;
public class Q27 {
    public static void main(String[] args) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] a = md.digest("x".getBytes());
        byte[] b = md.digest("x".getBytes());
        System.out.println(java.util.Arrays.equals(a, b));
    }
}
```

**Output:**
```
true
```

**Reason:** Same input → same SHA-256 hash (deterministic).

**Q28. What does this print?**

```java
import java.util.*;
public class Q28 {
    public static void main(String[] args) {
        Random r1 = new Random(42);
        Random r2 = new Random(42);
        System.out.println(r1.nextInt() == r2.nextInt());
    }
}
```

**Output:**
```
true
```

**Reason:** `java.util.Random` is deterministic given the same seed — predictable, not for security.

**Q29. What is wrong with `Cipher.getInstance("AES/ECB/PKCS5Padding")`?**

ECB leaks patterns; use `AES/GCM/NoPadding` (authenticated encryption).

**Q30. What does `MessageDigest.isEqual(a, b)` do?**

Constant-time comparison of two digests (prevents timing attacks).

## Internal Working

**Q31. How does `KeyPairGenerator` work?**

It uses a `Provider` implementation (e.g., SunRSA) to generate keys according to the algorithm and size; providers are pluggable (`Security.addProvider`).

**Q32. What is a JCA/JCE provider?**

A package implementing cryptographic algorithms; registered via `Security` or configured in `java.security`.

**Q33. How does `SecureRandom` get entropy?**

From the OS (`/dev/urandom`, `CryptGenRandom`, `getrandom`); `getInstanceStrong()` guarantees a strong implementation.

**Q34. What is a MAC?**

Message Authentication Code — keyed hash providing integrity and authenticity (HMAC).

**Q35. How does `Cipher` handle GCM IV/nonce?**

`GCMParameterSpec` requires a 12-byte IV; never reuse an IV with the same key.

## Tricky Questions

**Q36. Can SHA-256 be reversed?**

No — it's one-way (preimage resistant); use it for integrity, not encryption.

**Q37. Is `String.hashCode()` suitable for security?**

No — not cryptographic, predictable, collisions easy.

**Q38. Can you decrypt AES-GCM without the key?**

No (computationally infeasible); GCM also provides integrity (tampering detected).

**Q39. Is `java.util.Random` thread-safe?**

Yes (thread-safe via `AtomicLong` seed), but not cryptographically secure.

**Q40. What is the default `SecureRandom` algorithm?**

Provider-dependent (`SHA1PRNG` on Oracle/OpenJDK historically); always specify `getInstance("SHA256PRNG")` or `getInstanceStrong()` explicitly.