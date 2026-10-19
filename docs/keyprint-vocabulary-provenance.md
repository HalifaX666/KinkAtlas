# Four-Word Keyprint vocabulary provenance

KinkAtlas Four-Word Keyprints use the ordered English vocabulary published with
BIP-0039. KinkAtlas does not implement BIP-0039 wallets, mnemonic checksums,
seeds, recovery phrases, or wallet compatibility. It reuses only the stable
2,048-entry vocabulary to display four 11-bit indexes derived from an existing
Viewer Request public-key fingerprint.

## Pinned source

- Repository: `https://github.com/bitcoin/bips`
- Commit: `927b6de9915c9262615a6399de51b200f81e5aa4`
- Specification: `bip-0039.mediawiki`
- Vocabulary: `bip-0039/english.txt`
- Retrieved: 2026-10-18
- Exact upstream file SHA-256: `2F5EED53A4727B4BF8880D8F3F199EFC90E58503646D9FF8EFF3A2ED3B24DBDA`
- Ordered words joined by LF without a final LF SHA-256: `187DB04A869DD9BC7BE80D21A86497D692C0DB6ABD3AA8CB6BE5D618FF757FAE`
- KinkAtlas vocabulary version: `bip39-en-v1`

The vendored file is byte-for-byte identical to the pinned official source. It
must not be reordered, edited, translated, sanitized, or regenerated in place.
A future vocabulary requires a new explicit version.

## License and attribution

BIP-0039 identifies its license as MIT and directly links the ordered English
word list as its normative vocabulary. Its authors are Marek Palatinus, Pavol
Rusnak, Aaron Voisine, and Sean Bowe. The BIP's linked reference implementation,
`trezor/python-mnemonic`, independently distributes the same vocabulary under
the MIT License with copyright attributed to Pavol Rusnak.

Redistribution and modification are permitted by MIT provided its copyright and
permission notice are retained. KinkAtlas vendors the vocabulary unchanged and
retains the notice below. This third-party vocabulary is not covered by the
KinkAtlas authored-content reservation in `CONTENT-LICENSE.md`.

> The MIT License (MIT)
>
> Copyright (c) 2013-2016 Pavol Rusnak
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## Structural and language review

The pinned file contains exactly 2,048 unique lowercase ASCII words, no blank
entries, no case-normalized collisions, no punctuation, and words between three
and eight characters. The first four letters uniquely identify every word, as
required by BIP-0039.

The vocabulary is accepted unchanged with caveats. It contains potentially
distressing, violent, medical, substance-related, religious, and embarrassing
terms. Examples include `abuse`, `assault`, `blood`, `bomb`, `disease`, `fatal`,
`gun`, `horror`, `knife`, `prison`, `weapon`, `addict`, `alcohol`, `bless`,
`faith`, `gospel`, `adult`, and `bottom`. No slurs or explicit sexual terms were
identified in the review. Homophone or near-homophone pairs such as
`right`/`write`, `wear`/`where`, `piece`/`peace`, and `pair`/`pear` mean the list
is not universally pronunciation-clear, especially for international English
speakers or speech synthesis. Visual comparison remains available, and the
full fingerprint remains the advanced comparison form.

## Derivation and limitations

The existing version-1 SHA-256 Viewer Keyprint digest is unchanged. The first
44 digest bits are read in network order, most-significant bit first:

- bits 0-10: first word index
- bits 11-21: second word index
- bits 22-32: third word index
- bits 33-43: fourth word index

The four words encode exactly the same 44-bit comparison budget as the existing
short hexadecimal comparison code. They are a comparison aid, not a global
identity namespace, certificate, password, recovery phrase, encryption key, or
proof of real-world identity. They cannot decrypt a Capsule or recover a
deleted Viewer Request private key. Compare them over another trusted channel;
use the full fingerprint when stronger manual comparison is appropriate.
