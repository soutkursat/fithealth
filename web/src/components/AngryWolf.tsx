/** Hırlayan, gözleri kor gibi yanan kurt (motivasyon efekti için). */
export function AngryWolf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 420" className={className} aria-hidden>
      <defs>
        <linearGradient id="aw-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c7ccd6" />
          <stop offset="0.6" stopColor="#8c94a5" />
          <stop offset="1" stopColor="#5d6577" />
        </linearGradient>
        <linearGradient id="aw-ear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b6375" />
          <stop offset="1" stopColor="#353b49" />
        </linearGradient>
        <linearGradient id="aw-muzzle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f3f7" />
          <stop offset="1" stopColor="#c9ced8" />
        </linearGradient>
        <radialGradient id="aw-eye" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.35" stopColor="#ffb21e" />
          <stop offset="1" stopColor="#ff2a1a" />
        </radialGradient>
        <filter id="aw-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Arka yele */}
      <path
        fill="#1b2029"
        d="M200,20 L232,62 L282,34 L294,88 L352,78 L340,136 L392,152 L360,196 L398,236 L352,252 L376,300 L322,304 L326,352 L276,342 L262,392 L222,366 L200,412 L178,366 L138,392 L124,342 L74,352 L78,304 L24,300 L48,252 L2,236 L40,196 L8,152 L60,136 L48,78 L106,88 L118,34 L168,62 Z"
      />

      {/* Kulaklar */}
      <path fill="url(#aw-ear)" d="M86,24 L164,124 L66,176 Z" />
      <path fill="url(#aw-ear)" d="M314,24 L236,124 L334,176 Z" />
      <path fill="#6e1622" d="M94,60 L140,124 L80,154 Z" />
      <path fill="#6e1622" d="M306,60 L260,124 L320,154 Z" />

      {/* Baş */}
      <path
        fill="url(#aw-fur)"
        d="M58,172 L110,122 L160,112 L200,126 L240,112 L290,122 L342,172 L354,230 L378,262 L340,270 L360,302 L316,302 L300,342 L250,372 L200,398 L150,372 L100,342 L84,302 L40,302 L60,270 L22,262 L46,230 Z"
      />
      {/* Alın maskesi */}
      <path fill="#3a4151" d="M128,118 L200,196 L272,118 L240,112 L200,152 L160,112 Z" />
      {/* Yanak gölgeleri */}
      <path fill="#6b7386" opacity="0.7" d="M46,230 L120,250 L84,302 L40,302 L60,270 L22,262 Z" />
      <path fill="#6b7386" opacity="0.7" d="M354,230 L280,250 L316,302 L360,302 L340,270 L378,262 Z" />

      {/* Gözler (kor) */}
      <g filter="url(#aw-glow)">
        <path fill="url(#aw-eye)" d="M112,204 L184,222 L148,242 Z" />
        <path fill="url(#aw-eye)" d="M288,204 L216,222 L252,242 Z" />
      </g>
      <path fill="#1a0705" d="M149,211 L156,213 L151,236 Z" />
      <path fill="#1a0705" d="M251,211 L244,213 L249,236 Z" />

      {/* Çatık kaşlar */}
      <path fill="#151920" d="M92,170 L196,204 L188,224 L100,194 Z" />
      <path fill="#151920" d="M308,170 L204,204 L212,224 L300,194 Z" />

      {/* Burun köprüsü + ağız çevresi */}
      <path fill="url(#aw-muzzle)" d="M148,250 L200,236 L252,250 L266,306 L232,352 L200,362 L168,352 L134,306 Z" />
      {/* Hırlama kırışıkları */}
      <g stroke="#7c8496" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M176,246 L190,256" />
        <path d="M224,246 L210,256" />
        <path d="M170,256 L186,264" />
        <path d="M230,256 L214,264" />
      </g>
      {/* Burun */}
      <path fill="#0d0f14" d="M176,262 L224,262 L214,284 L200,292 L186,284 Z" />
      <path fill="#4a5060" d="M184,266 L200,266 L194,272 Z" />

      {/* Açık ağız */}
      <path fill="#4a0b13" d="M144,300 L200,314 L256,300 L244,346 L200,372 L156,346 Z" />
      <path fill="#b52f3d" d="M172,346 L200,356 L228,346 L216,364 L200,370 L184,364 Z" />
      {/* Dişler */}
      <g fill="#f6f3e8">
        <path d="M156,301 L170,304 L164,336 Z" />
        <path d="M244,301 L230,304 L236,336 Z" />
        <path d="M176,307 L186,309 L181,322 Z" />
        <path d="M190,311 L199,312 L195,324 Z" />
        <path d="M201,312 L210,311 L205,324 Z" />
        <path d="M214,309 L224,307 L219,322 Z" />
        <path d="M164,346 L174,350 L170,326 Z" />
        <path d="M236,346 L226,350 L230,326 Z" />
      </g>
      {/* Üst dudak çizgisi */}
      <path d="M138,298 L200,312 L262,298" stroke="#151920" strokeWidth="5" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
