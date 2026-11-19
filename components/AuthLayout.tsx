import React from 'react';
import Logo from './Logo';

export function FloatingPaths({ position }: { position: number }) {
	const paths = Array.from({ length: 18 }, (_, i) => ({
		id: i,
		d: `M-${380 - i * 10 * position} -${189 + i * 12}C-${
			380 - i * 10 * position
		} -${189 + i * 12} -${312 - i * 10 * position} ${216 - i * 12} ${
			152 - i * 10 * position
		} ${343 - i * 12}C${616 - i * 10 * position} ${470 - i * 12} ${
			684 - i * 10 * position
		} ${875 - i * 12} ${684 - i * 10 * position} ${875 - i * 12}`,
		width: 0.6 + i * 0.05,
	}));

	return (
		<div className="pointer-events-none absolute inset-0">
			<svg
				className="h-full w-full text-[#1D1D1F] dark:text-[#F5F5F7]"
				viewBox="0 0 696 316"
				fill="none"
			>
				<title>Background Paths</title>
				{paths.map((path) => (
					<path
						key={path.id}
						d={path.d}
						stroke="currentColor"
						strokeWidth={path.width}
						strokeOpacity={0.04 + path.id * 0.008}
					/>
				))}
			</svg>
		</div>
	);
}

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title?: string, subtitle?: string }) {
	return (
		<main className="relative min-h-screen lg:grid lg:grid-cols-2 bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] shrink-0">
			<div className="bg-white dark:bg-[#1C1C1E] relative hidden h-full min-h-screen flex-col border-r border-black/[0.06] dark:border-white/[0.08] p-10 lg:flex lg:sticky lg:top-0">
				<div className="z-10 flex items-center gap-2">
					<Logo scale={1} className="origin-left" />
				</div>
				<div className="z-10 mt-auto">
					<blockquote className="space-y-2">
						<p className="text-[20px] font-semibold tracking-tight leading-snug text-[#1D1D1F] dark:text-[#F5F5F7]">
							&ldquo;Premium mobile accessories and gadgets delivered right to your doorstep. Experience the best in tech.&rdquo;
						</p>
						<footer className="text-[13px] font-semibold text-[#6E6E73] dark:text-[#98989D]">
							DEEP SHOP
						</footer>
					</blockquote>
				</div>
				<div className="absolute inset-0 overflow-hidden">
					<FloatingPaths position={1} />
					<FloatingPaths position={-1} />
				</div>
			</div>
			<div className="relative flex min-h-screen flex-col p-4 md:p-8">
				<div className="mx-auto space-y-6 sm:w-[400px] w-full px-4 sm:px-0 md:pt-16 pb-10 z-10 relative my-auto">
					<div className="flex items-center gap-2 lg:hidden mt-4 mb-4">
						<Logo scale={0.8} className="origin-left" />
					</div>
					{(title || subtitle) && (
						<div className="flex flex-col space-y-2.5 mb-6">
							{title && (
								<h1 className="text-[28px] md:text-[32px] font-bold tracking-[-0.025em] text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
									{title}
								</h1>
							)}
							{subtitle && (
								<p className="text-[#6E6E73] dark:text-[#98989D] text-[14px] md:text-[15px] leading-relaxed">
									{subtitle}
								</p>
							)}
						</div>
					)}
					{children}
				</div>
			</div>
		</main>
	);
}

export const AuthSeparator = ({ text = "OR" }: { text?: string }) => {
	return (
		<div className="flex w-full items-center justify-center my-6">
			<div className="bg-black/[0.08] dark:bg-white/[0.1] h-px w-full" />
			<span className="text-[#6E6E73] dark:text-[#98989D] px-4 text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap">{text}</span>
			<div className="bg-black/[0.08] dark:bg-white/[0.1] h-px w-full" />
		</div>
	);
};
