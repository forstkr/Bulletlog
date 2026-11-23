import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap ${
          compact
            ? 'min-h-[36px] px-2.5 py-1 text-xs font-medium'
            : 'w-full min-h-[38px] px-3 py-2 text-xs font-medium'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>앱 설치</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap ${
            compact
              ? 'min-h-[36px] px-2.5 py-1 text-xs font-medium'
              : 'w-full min-h-[38px] px-3 py-2 text-xs font-medium'
          }`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>홈 화면에 추가</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="홈 화면에 추가 안내"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
            className="fixed inset-0 z-50 bg-zinc-950/25 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-900">
                  홈 화면에 추가
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="닫기"
                  className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs leading-relaxed text-zinc-600">
                1. Safari 하단의 <strong>공유</strong> 버튼을 누르세요.
                <br />
                2. 아래로 내려 <strong>홈 화면에 추가</strong>를 선택하세요.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full min-h-[40px] rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
