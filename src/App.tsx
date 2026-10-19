import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import type { Provider } from './types';
import { loadStored, saveStored, addPromptHistory } from './utils/storage';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

const PROVIDER_STORAGE_KEY = 'rcg:provider';
const API_KEYS_STORAGE_KEY = 'rcg:apiKeys';
const HISTORY_STORAGE_KEY = 'rcg:promptHistory';

function loadProvider(): Provider {
  const stored = loadStored<unknown>(PROVIDER_STORAGE_KEY, null);
  return stored === 'anthropic' || stored === 'google' ? stored : 'google';
}

function loadApiKeys(): Record<Provider, string> {
  const stored = loadStored<Partial<Record<Provider, unknown>>>(API_KEYS_STORAGE_KEY, {});
  return {
    anthropic: typeof stored?.anthropic === 'string' ? stored.anthropic : '',
    google: typeof stored?.google === 'string' ? stored.google : '',
  };
}

function loadHistory(): string[] {
  const stored = loadStored<unknown>(HISTORY_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored.filter((p): p is string => typeof p === 'string') : [];
}

function App() {
  // 키는 provider별로 따로 보관해, 다른 제공사 키가 잘못 전송되지 않게 한다
  const [apiKeys, setApiKeys] = useState<Record<Provider, string>>(loadApiKeys);
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<Provider>(loadProvider);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const apiKey = apiKeys[provider];
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();

  useEffect(() => saveStored(API_KEYS_STORAGE_KEY, apiKeys), [apiKeys]);
  useEffect(() => saveStored(PROVIDER_STORAGE_KEY, provider), [provider]);
  useEffect(() => saveStored(HISTORY_STORAGE_KEY, history), [history]);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];

  const handleGenerate = (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    setHistory((prev) => addPromptHistory(prev, prompt));
    generate(prompt, apiKey || undefined, provider);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const activeProvider = PROVIDER_CONFIG[provider].label;

  return (
    <div className="desktop">
      <div className="menubar" role="banner">
        <span className="menubar-brand">
          <span className="brand-mark" aria-hidden="true">RC</span>
          컴포넌트 생성기
        </span>
        <div className="menubar-status" aria-label="현재 작업 상태">
          <span>모델 {activeProvider}</span>
          <span>컴포넌트 {components.length}개</span>
        </div>
      </div>

      <div className="app">
        <header className="app-header">
          <h1>프롬프트로 만드는 UI 워크벤치</h1>
          <p>만들고 싶은 화면을 글로 적으면 React 컴포넌트가 바로 미리보기와 코드로 나옵니다.</p>
        </header>

        <main className="workspace">
          <section className="win composer-panel" aria-label="컴포넌트 생성">
            <div className="win-title" aria-hidden="true">
              <span className="win-box" />
              <span className="win-name">새 컴포넌트</span>
            </div>
            <div className="win-body">
              <PromptInput onGenerate={handleGenerate} isLoading={isLoading} history={history} />
            </div>
          </section>

          <aside className="win settings-panel" aria-label="실행 설정">
            <div className="win-title" aria-hidden="true">
              <span className="win-box" />
              <span className="win-name">실행 설정</span>
            </div>
            <div className="win-body">
              <div className="provider-select">
                <label htmlFor="provider">모델 제공사</label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as Provider)}
                >
                  {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="api-key-input">
                <label htmlFor="api-key">API 키</label>
                <div className="api-key-field">
                  <input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder={
                      hasEnvKey
                        ? '서버 키 사용 중 (직접 입력으로 덮어쓰기 가능)'
                        : PROVIDER_CONFIG[provider].placeholder
                    }
                  />
                  <button
                    className="btn-toggle-key"
                    onClick={() => setShowKey(!showKey)}
                    type="button"
                  >
                    {showKey ? '숨기기' : '보기'}
                  </button>
                </div>
                <p className={`key-status ${hasEnvKey ? 'key-status--ready' : ''}`}>
                  {hasEnvKey
                    ? '.env 키가 연결되어 있습니다.'
                    : '직접 입력하거나 서버 환경변수를 설정하세요.'}
                </p>
              </div>
            </div>
          </aside>
        </main>

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon" aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        <section className="results-section">
          {components.length > 0 && (
            <div className="results-header">
              <h2>생성된 컴포넌트</h2>
              <button className="btn-clear" onClick={clearAll}>
                전체 삭제
              </button>
            </div>
          )}

          {components.length === 0 && !isLoading && (
            <div className="win empty-state">
              <div className="win-title" aria-hidden="true">
                <span className="win-box" />
                <span className="win-name">비어 있음</span>
              </div>
              <div className="win-body empty-body">
                <div className="empty-preview" aria-hidden="true">
                  <div className="empty-canvas">
                    <div className="empty-card empty-card--primary" />
                    <div className="empty-card" />
                    <div className="empty-card empty-card--wide" />
                  </div>
                </div>
                <div className="empty-copy">
                  <h2>새 컴포넌트를 생성해보세요.</h2>
                  <p>위 입력창에 만들 화면을 적고 Cmd/Ctrl + Enter를 누르면 여기에 쌓입니다.</p>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="win loading-card" role="status">
              <div className="win-title" aria-hidden="true">
                <span className="win-box" />
                <span className="win-name">생성 중</span>
              </div>
              <div className="win-body">
                <p>컴포넌트를 생성하고 있습니다...</p>
                <div className="loading-bar" aria-hidden="true" />
              </div>
            </div>
          )}

          <div className="results-grid">
            {components.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                onRemove={removeComponent}
                onRegenerate={handleGenerate}
                isLoading={isLoading}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
