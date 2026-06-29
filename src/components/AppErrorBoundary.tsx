import React from 'react';

type Props = {
  children: any;
};

type State = {
  error?: Error;
};

export class AppErrorBoundary extends (React as any).Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error) {
    console.error('Errore applicazione', error);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="auth-page">
          <section className="panel auth-panel" role="alert">
            <p className="eyebrow">Servizio neve</p>
            <h1>Impossibile avviare la webapp</h1>
            <p className="error">{this.state.error.message}</p>
            <p>Ricarica la pagina o verifica la configurazione del deploy.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
