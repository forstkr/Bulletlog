import type { AuthStatus } from '../hooks/useAuth';

interface LoginScreenProps {
  status: AuthStatus;
  error: string | null;
  isSigningIn: boolean;
  onSignIn: () => Promise<void>;
}

export function LoginScreen({
  status,
  error,
  isSigningIn,
  onSignIn,
}: LoginScreenProps) {
  const isUnconfigured = status === 'unconfigured';

  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Minimalist emblem & title */}
        <div className="mb-10">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center mb-6"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Bulletlog
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            할 일, 일정, 메모를 가볍게 기록하고 모든 기기에서 실시간으로 동기화합니다.
          </p>
        </div>

        {/* Single primary Google Sign-In button */}
        <button
          type="button"
          onClick={() => void onSignIn()}
          disabled={isSigningIn || isUnconfigured}
          className={`w-full min-h-[48px] px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
            isSigningIn || isUnconfigured
              ? 'border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed'
              : 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 active:bg-zinc-100'
          }`}
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
          >
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.29v3.1A11.99 11.99 0 0 0 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.29v-3.1H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.29 5.39l3.99-3.1z"
            />
            <path
              fill="#EA4335"
              d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.61l3.99 3.1C6.23 6.87 8.88 4.76 12 4.76z"
            />
          </svg>
          <span className="whitespace-nowrap">
            {isSigningIn ? '로그인 중...' : 'Google 계정으로 시작하기'}
          </span>
        </button>

        {/* Inline error or missing env notice */}
        {error && (
          <p
            role="alert"
            className="mt-4 text-xs leading-relaxed text-red-600"
          >
            {error}
          </p>
        )}

        {isUnconfigured && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-600">
            <p className="font-medium text-zinc-800">
              Firebase 환경변수가 설정되지 않았습니다
            </p>
            <p className="mt-1.5 text-zinc-500">
              프로젝트 루트에 <code className="font-mono text-zinc-700">.env</code>{' '}
              파일을 만들고 <code className="font-mono text-zinc-700">VITE_FIREBASE_*</code>와{' '}
              <code className="font-mono text-zinc-700">VITE_ALLOWED_EMAIL</code>을 입력해 주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
