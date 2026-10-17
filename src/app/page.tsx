import { getSiteContent } from "@/lib/content";
import { Header } from "@/components/navigation/Header";
import { AgeGate } from "@/components/gate/AgeGate";
import { Hero } from "@/components/home/Hero";
import { ManifestoSection } from "@/components/home/ManifestoSection";
import { BenefitsSlider } from "@/components/home/BenefitsSlider";
import { HowItWorks } from "@/components/home/HowItWorks";
import { MembershipSection } from "@/components/home/MembershipSection";
import { Gallery } from "@/components/home/Gallery";
import { EventsSection } from "@/components/home/EventsSection";
import { RegistrationSection } from "@/components/home/RegistrationSection";
import { FinalCta } from "@/components/home/FinalCta";
import { Footer } from "@/components/navigation/Footer";
import { CustomCursor } from "@/components/motion/CustomCursor";
import { AttributionTracker } from "@/components/tracking/AttributionTracker";
import { BackgroundAudio } from "@/components/audio/BackgroundAudio";

export default async function HomePage() {
  const content = await getSiteContent();

  return (
    <>
      {/* Background Audio (José José at 01:10) */}
      <BackgroundAudio />

      {/* Attribution & Age Gate */}
      <AttributionTracker />
      <AgeGate />

      {/* Film Grain Texture Overlay */}
      <div className="grain" aria-hidden="true" />

      {/* Desktop Luxury Follower */}
      <CustomCursor />

      {/* Navigation Header */}
      <Header />

      <main className="relative z-10">
        {/* 1. HERO (Full Screen ~100vh) */}
        <Hero content={content.hero} />

        {/* 2. MANIFIESTO */}
        <ManifestoSection content={content.manifesto} />

        {/* 3. BENEFICIOS */}
        <BenefitsSlider
          eyebrow={content.benefits.eyebrow}
          titleLines={content.benefits.titleLines}
          items={content.benefits.items}
        />

        {/* 4. CÓMO FUNCIONA */}
        <HowItWorks
          eyebrow={content.howItWorks.eyebrow}
          titleLines={content.howItWorks.titleLines}
          steps={content.howItWorks.steps}
        />

        {/* 5. MEMBRESÍA DIGITAL */}
        <MembershipSection content={content.membership} />

        {/* 6. GALERÍA / CULTURA DEL CLUB */}
        <Gallery content={content.gallery} />

        {/* 7. EVENTOS */}
        <EventsSection
          eyebrow={content.events.eyebrow}
          titleLines={content.events.titleLines}
          items={content.events.items}
        />

        {/* 8. REGISTRO */}
        <RegistrationSection
          eyebrow={content.registration.eyebrow}
          titleLines={content.registration.titleLines}
          body={content.registration.body}
        />

        {/* 9. CTA FINAL */}
        <FinalCta content={content.finalCta} />
      </main>

      {/* FOOTER */}
      <Footer social={content.social} contactEmail={content.contactEmail} />
    </>
  );
}
