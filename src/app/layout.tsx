import type { Metadata } from 'next';
import { Inter, Noto_Sans_SC } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' });
const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sc'
});

export const metadata: Metadata = {
  title: 'HanziFlow — Nền tảng Học & Ôn tập Tiếng Trung SRS',
  description: 'Lộ trình kép HSK & Giao tiếp, Flashcard SRS, Bài khóa đóng vai và Luyện thi HSK'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${notoSansSC.variable}`}>
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}