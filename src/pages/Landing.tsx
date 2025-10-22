import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Brain, TrendingUp, Zap } from "lucide-react";

const Landing = () => {
  const features = [
    {
      icon: CheckCircle2,
      title: "Real-time Check-ins",
      description: "Stay accountable with random attention prompts during your focus sessions"
    },
    {
      icon: Brain,
      title: "Attention Training",
      description: "Build genuine focus discipline through scientifically-backed interval training"
    },
    {
      icon: TrendingUp,
      title: "Smart Analytics",
      description: "Track your progress with detailed insights and gamified metrics"
    },
    {
      icon: Zap,
      title: "Adaptive System",
      description: "Customize check-in intervals and training intensity to match your needs"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary bg-[length:200%_200%] animate-gradient-shift opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="animate-slide-up">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Train Your Time.<br />Master Your Mind.
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
              The only productivity app that actively trains your attention span
            </p>
            <Link to="/timetable">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 h-auto rounded-xl shadow-2xl animate-glow-pulse"
              >
                Start Your First Focus Session
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            Built for Deep Work
          </h2>
          <p className="text-xl text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Ticus combines proven productivity techniques with active attention training
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="p-6 bg-gradient-card backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-hero">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Focus?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands building unbreakable focus habits
          </p>
          <Link to="/timetable">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 h-auto rounded-xl shadow-2xl"
            >
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
