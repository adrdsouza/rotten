import { component$, useStylesScoped$ } from '@builder.io/qwik';

export interface OrderProcessingModalProps {
  visible: boolean;
}

const messages = [
  '🔥 Forging your items in hellfire...',
  '🧌 Summoning the payment demons...',
  '📜 Consulting the dark ledgers...',
  '💀 Slaying the credit card demons...',
  '🗡️ Sharpening our transaction blade...',
  '🏦 Battling the bank overlords...',
  '🩸 Making a blood oath...'
];

export const OrderProcessingModal = component$<OrderProcessingModalProps>(({ visible }) => {
  // 🚀 OPTIMIZED: CSS-based message cycling animation (no JavaScript intervals)
  useStylesScoped$(`
    .message-cycle {
      animation: messageCycle ${messages.length * 1.5}s infinite;
    }

    @keyframes messageCycle {
      ${messages.map((_, index) => {
        const startPercent = (index / messages.length) * 100;
        const endPercent = ((index + 1) / messages.length) * 100;
        return `
          ${startPercent}%, ${Math.min(endPercent - 0.1, 99.9)}% {
            opacity: ${index === 0 ? 1 : 0};
          }
        `;
      }).join('')}
    }

    ${messages.map((_, index) => `
      .message-${index} {
        animation: message${index}Cycle ${messages.length * 1.5}s infinite;
      }

      @keyframes message${index}Cycle {
        ${messages.map((_, msgIndex) => {
          const startPercent = (msgIndex / messages.length) * 100;
          const endPercent = ((msgIndex + 1) / messages.length) * 100;
          return `
            ${startPercent}%, ${Math.min(endPercent - 0.1, 99.9)}% {
              opacity: ${msgIndex === index ? 1 : 0};
            }
          `;
        }).join('')}
      }
    `).join('')}
  `);

  if (!visible) return null;

  // Loader icon (spinner)
  return (
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-xs">
      <div class="bg-zinc-900 text-white p-8 rounded-2xl shadow-2xl w-[90%] max-w-lg text-center border border-zinc-700 relative overflow-hidden">
        {/* Emergency close button - removed since modal should close automatically */}
        
        {/* Subtle background pattern */}
        <div class="absolute inset-0 opacity-5">
          <div class="absolute inset-0 bg-linear-to-br from-red-800/20 to-orange-800/20"></div>
        </div>
        <div class="relative z-10">
          {/* Loader spinner */}
          <div class="mb-6 flex items-center justify-center min-h-[96px]">
            <div class="relative mx-auto w-16 h-16">
              <div class="absolute inset-0 rounded-full border-4 border-red-600/30"></div>
              <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-red-500 animate-spin"></div>
              <div class="absolute inset-2 bg-red-600/20 rounded-full animate-pulse"></div>
              <div class="absolute inset-4 bg-red-500/40 rounded-full animate-ping"></div>
            </div>
          </div>
          {/* CSS-animated message cycling */}
          <div class="mb-4 relative" style={{ minHeight: '2.5em' }}>
            {messages.map((message, index) => (
              <p
                key={index}
                class={`message-${index} absolute inset-0 text-xl font-mono font-medium tracking-wide leading-relaxed flex items-center justify-center`}
              >
                {message}
              </p>
            ))}
          </div>
          {/* Subtle brand messaging */}
          <div class="mt-6 text-xs text-zinc-400 font-mono opacity-75">
            DAMNED DESIGNS • PAYMENT IN PROGRESS
          </div>
        </div>
      </div>
    </div>
  );
});
