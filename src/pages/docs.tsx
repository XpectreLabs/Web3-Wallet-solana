import Head from 'next/head';
import { FC } from 'react';

export const SwaggerDocsView: FC = () => {
  return (
    <>
      <Head>
        <title>Xpectre DApp — REST API Documentation (Swagger)</title>
        <meta name="description" content="Documentación interactiva Swagger / OpenAPI para las APIs Backend de Xpectre Solana DApp" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css"
        />
      </Head>
      <div className="min-h-screen bg-[#10131c] text-white">
        <header className="px-6 py-4 border-b border-[#dea001]/20 flex items-center justify-between bg-[#1a2535]">
          <div className="flex items-center gap-3">
            <img src="/long.PNG" alt="Xpectre Logo" className="h-7 w-auto" />
            <h1 className="text-xl font-bold text-[#dea001]">Backend REST API Documentation</h1>
          </div>
          <span className="text-xs font-mono bg-[#dea001]/10 text-[#dea001] px-2.5 py-1 rounded-md border border-[#dea001]/30">
            OpenAPI v3.0.0
          </span>
        </header>

        <main className="p-4 sm:p-8">
          <div id="swagger-ui" className="bg-white rounded-2xl p-4 shadow-2xl overflow-hidden" />
        </main>

        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"
          onLoad={() => {
            if (typeof window !== 'undefined' && (window as any).SwaggerUIBundle) {
              (window as any).SwaggerUIBundle({
                url: '/swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  (window as any).SwaggerUIBundle.presets.apis,
                  (window as any).SwaggerUIBundle.SwaggerUIStandalonePreset,
                ],
              });
            }
          }}
        />
      </div>
    </>
  );
};

export default SwaggerDocsView;
