import { Component } from 'react';
import { Result, Button } from 'antd';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('Section error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Result
                    status="error"
                    title="Что-то пошло не так"
                    subTitle={this.state.error?.message || 'Произошла непредвиденная ошибка в этом разделе.'}
                    extra={
                        <Button
                            type="primary"
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            Попробовать снова
                        </Button>
                    }
                    style={{ padding: '60px 0' }}
                />
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
